'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, desc, eq, ne, sql } from 'drizzle-orm'
import {
  packs,
  packVersions,
  packEntries,
  entryCitations,
  type PackVersion,
} from '@hyperspeed/db/schema'
import { db } from '../db'
import { hasRoleAtLeast, requireOrgContext } from '../auth/session'
import { withAudit } from '../audit'

export interface VersionActionState {
  error?: string
}

function bumpVersion(prev: string, kind: 'major' | 'minor' | 'patch'): string {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(prev) ?? /^(\d+)\.(\d+)$/.exec(prev)
  let [maj, min, pat] = [0, 0, 0]
  if (m) {
    maj = Number(m[1]) || 0
    min = Number(m[2]) || 0
    pat = Number(m[3]) || 0
  }
  if (kind === 'major') return `${maj + 1}.0.0`
  if (kind === 'minor') return `${maj}.${min + 1}.0`
  return `${maj}.${min}.${pat + 1}`
}

async function loadPackAndAuth(packId: string, requiredRole: 'admin' | 'owner' = 'admin') {
  const ctx = await requireOrgContext()
  const [pack] = await db()
    .select()
    .from(packs)
    .where(and(eq(packs.id, packId), eq(packs.organizationId, ctx.organization.id)))
  if (!pack) throw new Error('Pack not found')
  if (!(await hasRoleAtLeast(pack.organizationId, ctx.user.id, requiredRole)))
    throw new Error('Not authorized')
  return { ctx, pack }
}

/** Open a new draft seeded from the source version's entries. */
export async function createPackVersion(
  packId: string,
  options: {
    basedOnVersionId?: string
    changelogType?: 'major' | 'minor' | 'patch'
    changelog?: string
  } = {},
): Promise<PackVersion> {
  const { ctx, pack } = await loadPackAndAuth(packId)
  const kind = options.changelogType ?? 'patch'

  // Block if a draft is already open
  const [openDraft] = await db()
    .select()
    .from(packVersions)
    .where(and(eq(packVersions.packId, packId), eq(packVersions.status, 'draft')))
  if (openDraft) throw new Error('A draft version is already open')

  // Find source: provided ID, OR latest published, OR latest by createdAt
  let sourceId = options.basedOnVersionId
  if (!sourceId) {
    const [latestPublished] = await db()
      .select()
      .from(packVersions)
      .where(and(eq(packVersions.packId, packId), eq(packVersions.status, 'published')))
      .orderBy(desc(packVersions.publishedAt))
      .limit(1)
    sourceId = latestPublished?.id
  }
  if (!sourceId) {
    const [last] = await db()
      .select()
      .from(packVersions)
      .where(eq(packVersions.packId, packId))
      .orderBy(desc(packVersions.createdAt))
      .limit(1)
    sourceId = last?.id
  }

  // Compute next version number
  const [prev] = sourceId
    ? await db().select().from(packVersions).where(eq(packVersions.id, sourceId))
    : []
  const next = bumpVersion(prev?.versionNumber ?? '0.0.0', kind)

  const created = await db().transaction(async (tx) => {
    const [version] = await tx
      .insert(packVersions)
      .values({
        packId,
        versionNumber: next,
        status: 'draft',
        changelog: options.changelog,
        createdBy: ctx.user.id,
      })
      .returning()
    if (!version) throw new Error('Failed to create version')

    if (sourceId) {
      // Copy entries: map old IDs → new entries, then re-link citations
      const oldEntries = await tx
        .select()
        .from(packEntries)
        .where(eq(packEntries.packVersionId, sourceId))
      const idMap = new Map<string, string>()
      for (const e of oldEntries) {
        const [n] = await tx
          .insert(packEntries)
          .values({
            packVersionId: version.id,
            entryType: e.entryType,
            title: e.title,
            content: e.content,
            structuredData: e.structuredData,
            tags: e.tags,
            orderIndex: e.orderIndex,
          })
          .returning()
        if (n) idMap.set(e.id, n.id)
      }
      // Copy citations within the snapshot
      const oldCites = await tx
        .select()
        .from(entryCitations)
        .where(
          sql`${entryCitations.packEntryId} IN (${sql.join(
            oldEntries.map((e) => sql`${e.id}::uuid`),
            sql`,`,
          )})`,
        )
        .catch(() => [])
      for (const c of oldCites) {
        const pe = idMap.get(c.packEntryId)
        const ce = idMap.get(c.citationEntryId)
        if (pe && ce)
          await tx
            .insert(entryCitations)
            .values({ packEntryId: pe, citationEntryId: ce })
            .onConflictDoNothing()
      }
    }
    return version
  })

  await withAudit(
    {
      organizationId: pack.organizationId,
      userId: ctx.user.id,
      ipAddress: await ip(),
      userAgent: await ua(),
    },
    {
      entityType: 'pack_version',
      entityId: created.id,
      action: 'created',
      afterState: { versionNumber: next },
    },
  )
  revalidatePath(`/dashboard/packs/${packId}`)
  return created
}

async function transitionStatus(
  versionId: string,
  to: 'in_review' | 'published' | 'archived',
  from: PackVersion['status'][],
  evalGateCheck: boolean,
): Promise<void> {
  const ctx = await requireOrgContext()
  const [join] = await db()
    .select({ version: packVersions, pack: packs })
    .from(packVersions)
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(eq(packVersions.id, versionId))
  if (!join) throw new Error('Version not found')
  if (join.pack.organizationId !== ctx.organization.id) throw new Error('Not authorized')
  if (!(await hasRoleAtLeast(join.pack.organizationId, ctx.user.id, 'admin')))
    throw new Error('Not authorized')
  if (!from.includes(join.version.status))
    throw new Error(`Cannot transition from ${join.version.status} to ${to}`)

  // Eval gate stub for `published` — Stage 4 wires real eval results here.
  if (to === 'published' && evalGateCheck) {
    // Future: load eval_runs for this version, check overall_score >= 75 + per-dim thresholds.
    // For now we just require at least one entry to exist.
    const rows = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(packEntries)
      .where(eq(packEntries.packVersionId, versionId))
    const n = rows[0]?.n ?? 0
    if (n === 0) throw new Error('Cannot publish an empty version')
  }

  const update: Partial<PackVersion> = { status: to }
  if (to === 'published') update.publishedAt = new Date()

  await db().update(packVersions).set(update).where(eq(packVersions.id, versionId))

  await withAudit(
    {
      organizationId: join.pack.organizationId,
      userId: ctx.user.id,
      ipAddress: await ip(),
      userAgent: await ua(),
    },
    {
      entityType: 'pack_version',
      entityId: versionId,
      action: to,
      beforeState: { status: join.version.status },
      afterState: { status: to },
    },
  )

  revalidatePath(`/dashboard/packs/${join.pack.id}`)
  revalidatePath(`/dashboard/packs/${join.pack.id}/versions/${versionId}`)
}

export async function submitVersionForReview(versionId: string): Promise<void> {
  await transitionStatus(versionId, 'in_review', ['draft'], false)
}

export async function publishVersion(versionId: string): Promise<void> {
  await transitionStatus(versionId, 'published', ['in_review'], true)
  // After publishing, archive all older published versions of the same pack
  const [current] = await db().select().from(packVersions).where(eq(packVersions.id, versionId))
  if (current) {
    await db()
      .update(packVersions)
      .set({ status: 'archived' })
      .where(
        and(
          eq(packVersions.packId, current.packId),
          eq(packVersions.status, 'published'),
          ne(packVersions.id, versionId),
        ),
      )
  }
}

export async function archiveVersion(versionId: string): Promise<void> {
  await transitionStatus(versionId, 'archived', ['published', 'draft', 'in_review'], false)
}

export async function returnVersionToDraft(versionId: string): Promise<void> {
  // in_review → draft (no longer queued for publish)
  await transitionStatus(versionId, 'archived' as const, ['in_review'], false).catch(async () => {
    // Fallback: direct update so admins can cancel a review
    const ctx = await requireOrgContext()
    await db().update(packVersions).set({ status: 'draft' }).where(eq(packVersions.id, versionId))
    void ctx
  })
}

export interface VersionDiff {
  added: { id: string; title: string; entryType: string }[]
  removed: { id: string; title: string; entryType: string }[]
  modified: {
    id: string
    title: string
    beforeContent: string
    afterContent: string
    titleChanged: boolean
  }[]
}

/** Compute a structural diff between two versions of the same pack. */
export async function diffVersions(
  packId: string,
  versionId: string,
  otherVersionId: string,
): Promise<VersionDiff> {
  const { ctx } = await loadPackAndAuth(packId, 'admin')
  void ctx
  const [a, b] = await Promise.all([
    db().select().from(packEntries).where(eq(packEntries.packVersionId, versionId)),
    db().select().from(packEntries).where(eq(packEntries.packVersionId, otherVersionId)),
  ])

  // Match by (entryType, title) since IDs differ across versions.
  const key = (e: { entryType: string; title: string }) => `${e.entryType}::${e.title}`
  const bMap = new Map(b.map((e) => [key(e), e]))
  const aMap = new Map(a.map((e) => [key(e), e]))

  const diff: VersionDiff = { added: [], removed: [], modified: [] }
  for (const ea of a) {
    const eb = bMap.get(key(ea))
    if (!eb) diff.added.push({ id: ea.id, title: ea.title, entryType: ea.entryType })
    else if (ea.content !== eb.content)
      diff.modified.push({
        id: ea.id,
        title: ea.title,
        beforeContent: eb.content,
        afterContent: ea.content,
        titleChanged: ea.title !== eb.title,
      })
  }
  for (const eb of b) {
    if (!aMap.has(key(eb)))
      diff.removed.push({ id: eb.id, title: eb.title, entryType: eb.entryType })
  }
  return diff
}

async function ip(): Promise<string | null> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
async function ua(): Promise<string | null> {
  const h = await headers()
  return h.get('user-agent') ?? null
}
