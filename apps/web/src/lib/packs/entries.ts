'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  packs,
  packVersions,
  packEntries,
  entryCitations,
  type PackEntry,
} from '@hyperspeed/db/schema'
import { ENTRY_TYPES } from '@hyperspeed/shared/constants'
import { db } from '../db'
import { hasRoleAtLeast, requireOrgContext } from '../auth/session'
import { withAudit } from '../audit'

async function loadEditableVersion(versionId: string) {
  const ctx = await requireOrgContext()
  const [row] = await db()
    .select({ version: packVersions, pack: packs })
    .from(packVersions)
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(and(eq(packVersions.id, versionId), eq(packs.organizationId, ctx.organization.id)))
  if (!row) throw new Error('Version not found')
  if (row.version.status === 'published' || row.version.status === 'archived') {
    throw new Error(`Cannot edit a ${row.version.status} version`)
  }
  if (!(await hasRoleAtLeast(row.pack.organizationId, ctx.user.id, 'admin'))) {
    throw new Error('Not authorized')
  }
  return { ctx, version: row.version, pack: row.pack }
}

export async function listEntries(versionId: string): Promise<PackEntry[]> {
  const ctx = await requireOrgContext()
  // Scope check via join (RLS would catch this but explicit too)
  const [row] = await db()
    .select({ orgId: packs.organizationId })
    .from(packVersions)
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(eq(packVersions.id, versionId))
  if (!row || row.orgId !== ctx.organization.id) throw new Error('Not found')
  return db()
    .select()
    .from(packEntries)
    .where(eq(packEntries.packVersionId, versionId))
    .orderBy(asc(packEntries.orderIndex), asc(packEntries.createdAt))
}

const entrySchema = z.object({
  entryType: z.enum(ENTRY_TYPES),
  title: z.string().min(1).max(280),
  content: z.string().min(1).max(50000),
  tags: z
    .string()
    .optional()
    .transform((s) =>
      s
        ? s
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    ),
  structuredData: z.string().optional(),
})

export async function createEntry(
  versionId: string,
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  let ctxVer
  try {
    ctxVer = await loadEditableVersion(versionId)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Auth error' }
  }

  const parsed = entrySchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.message }

  let structured: Record<string, unknown> | null = null
  if (parsed.data.structuredData) {
    try {
      structured = JSON.parse(parsed.data.structuredData) as Record<string, unknown>
    } catch {
      return { error: 'structured_data is not valid JSON' }
    }
  }

  // Highest current orderIndex + 1
  const [last] = await db()
    .select({ max: sql<number>`coalesce(max(${packEntries.orderIndex}), -1)` })
    .from(packEntries)
    .where(eq(packEntries.packVersionId, versionId))
  const nextOrder = (last?.max ?? -1) + 1

  const [created] = await db()
    .insert(packEntries)
    .values({
      packVersionId: versionId,
      entryType: parsed.data.entryType,
      title: parsed.data.title,
      content: parsed.data.content,
      tags: parsed.data.tags,
      structuredData: structured,
      orderIndex: nextOrder,
    })
    .returning()
  if (!created) return { error: 'Insert failed' }

  await withAudit(
    {
      organizationId: ctxVer.pack.organizationId,
      userId: ctxVer.ctx.user.id,
      ipAddress: await ip(),
      userAgent: await ua(),
    },
    {
      entityType: 'pack_entry',
      entityId: created.id,
      action: 'created',
      afterState: { entryType: created.entryType, title: created.title },
    },
  )
  revalidatePath(`/dashboard/packs/${ctxVer.pack.id}/versions/${versionId}/edit`)
  return { id: created.id }
}

export async function updateEntry(
  entryId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireOrgContext()
  const [existing] = await db()
    .select({ entry: packEntries, version: packVersions, pack: packs })
    .from(packEntries)
    .innerJoin(packVersions, eq(packEntries.packVersionId, packVersions.id))
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(eq(packEntries.id, entryId))
  if (!existing || existing.pack.organizationId !== ctx.organization.id)
    return { error: 'Not found' }
  if (existing.version.status === 'published' || existing.version.status === 'archived')
    return { error: `Cannot edit a ${existing.version.status} version` }
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')))
    return { error: 'Not authorized' }

  const parsed = entrySchema.partial().safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.message }

  const patch: Partial<PackEntry> = {}
  if (parsed.data.title !== undefined) patch.title = parsed.data.title
  if (parsed.data.content !== undefined) patch.content = parsed.data.content
  if (parsed.data.tags) patch.tags = parsed.data.tags
  if (parsed.data.entryType) patch.entryType = parsed.data.entryType
  if (parsed.data.structuredData !== undefined) {
    if (parsed.data.structuredData === '') patch.structuredData = null
    else {
      try {
        patch.structuredData = JSON.parse(parsed.data.structuredData) as Record<string, unknown>
      } catch {
        return { error: 'structured_data is not valid JSON' }
      }
    }
  }

  const [updated] = await db()
    .update(packEntries)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(packEntries.id, entryId))
    .returning()

  await withAudit(
    {
      organizationId: existing.pack.organizationId,
      userId: ctx.user.id,
      ipAddress: await ip(),
      userAgent: await ua(),
    },
    {
      entityType: 'pack_entry',
      entityId: entryId,
      action: 'updated',
      beforeState: existing.entry,
      afterState: updated,
    },
  )

  revalidatePath(`/dashboard/packs/${existing.pack.id}/versions/${existing.version.id}/edit`)
  return { ok: true }
}

export async function deleteEntry(entryId: string): Promise<void> {
  const ctx = await requireOrgContext()
  const [existing] = await db()
    .select({ entry: packEntries, version: packVersions, pack: packs })
    .from(packEntries)
    .innerJoin(packVersions, eq(packEntries.packVersionId, packVersions.id))
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(eq(packEntries.id, entryId))
  if (!existing || existing.pack.organizationId !== ctx.organization.id) return
  if (existing.version.status === 'published' || existing.version.status === 'archived') return
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin'))) return

  await db().delete(packEntries).where(eq(packEntries.id, entryId))

  await withAudit(
    {
      organizationId: existing.pack.organizationId,
      userId: ctx.user.id,
      ipAddress: await ip(),
      userAgent: await ua(),
    },
    { entityType: 'pack_entry', entityId: entryId, action: 'deleted', beforeState: existing.entry },
  )

  revalidatePath(`/dashboard/packs/${existing.pack.id}/versions/${existing.version.id}/edit`)
}

export async function moveEntry(entryId: string, direction: 'up' | 'down'): Promise<void> {
  const ctx = await requireOrgContext()
  const [existing] = await db()
    .select({ entry: packEntries, version: packVersions, pack: packs })
    .from(packEntries)
    .innerJoin(packVersions, eq(packEntries.packVersionId, packVersions.id))
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(eq(packEntries.id, entryId))
  if (!existing || existing.pack.organizationId !== ctx.organization.id) return
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin'))) return

  // Find the neighbor in the chosen direction
  const orderOp = direction === 'up' ? desc : asc
  const cmpRows = await db()
    .select()
    .from(packEntries)
    .where(
      and(
        eq(packEntries.packVersionId, existing.entry.packVersionId),
        direction === 'up'
          ? sql`${packEntries.orderIndex} < ${existing.entry.orderIndex}`
          : sql`${packEntries.orderIndex} > ${existing.entry.orderIndex}`,
      ),
    )
    .orderBy(orderOp(packEntries.orderIndex))
    .limit(1)
  const neighbor = cmpRows[0]
  if (!neighbor) return

  // Swap orderIndex values
  await db().transaction(async (tx) => {
    await tx
      .update(packEntries)
      .set({ orderIndex: -1 })
      .where(eq(packEntries.id, existing.entry.id))
    await tx
      .update(packEntries)
      .set({ orderIndex: existing.entry.orderIndex })
      .where(eq(packEntries.id, neighbor.id))
    await tx
      .update(packEntries)
      .set({ orderIndex: neighbor.orderIndex })
      .where(eq(packEntries.id, existing.entry.id))
  })

  revalidatePath(`/dashboard/packs/${existing.pack.id}/versions/${existing.version.id}/edit`)
}

export async function addCitation(entryId: string, citationEntryId: string): Promise<void> {
  const ctx = await requireOrgContext()
  const [join] = await db()
    .select({ pack: packs, version: packVersions })
    .from(packEntries)
    .innerJoin(packVersions, eq(packEntries.packVersionId, packVersions.id))
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(eq(packEntries.id, entryId))
  if (!join || join.pack.organizationId !== ctx.organization.id) return
  await db()
    .insert(entryCitations)
    .values({ packEntryId: entryId, citationEntryId })
    .onConflictDoNothing()
  revalidatePath(`/dashboard/packs/${join.pack.id}/versions/${join.version.id}/edit`)
}

async function ip(): Promise<string | null> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
async function ua(): Promise<string | null> {
  const h = await headers()
  return h.get('user-agent') ?? null
}
