'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import {
  packEntries,
  packVersions,
  packs,
  proposedEntries,
  sourceDocuments,
  categories,
  type ProposedEntry,
} from '@hyperspeed/db/schema'
import { extractPackEntries, isAnthropicConfigured } from '@hyperspeed/eval'
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
  if (row.version.status === 'published' || row.version.status === 'archived')
    throw new Error(`Cannot edit a ${row.version.status} version`)
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')))
    throw new Error('Not authorized')
  return { ctx, version: row.version, pack: row.pack }
}

export async function listProposals(versionId: string) {
  return db()
    .select()
    .from(proposedEntries)
    .where(eq(proposedEntries.packVersionId, versionId))
    .orderBy(asc(proposedEntries.createdAt))
}

export async function runIngestion(
  versionId: string,
  documentIds: string[],
): Promise<{ created: number; error?: string }> {
  let envCheck
  try {
    envCheck = await loadEditableVersion(versionId)
  } catch (e) {
    return { created: 0, error: e instanceof Error ? e.message : 'Auth error' }
  }
  if (!isAnthropicConfigured()) {
    return {
      created: 0,
      error: 'AI ingestion requires ANTHROPIC_API_KEY in the server environment.',
    }
  }
  const { ctx, version, pack } = envCheck

  const docs = await db()
    .select()
    .from(sourceDocuments)
    .where(
      and(
        inArray(sourceDocuments.id, documentIds),
        eq(sourceDocuments.organizationId, ctx.organization.id),
      ),
    )
  if (docs.length === 0) return { created: 0, error: 'No accessible documents' }

  const [cat] = pack.categoryId
    ? await db().select().from(categories).where(eq(categories.id, pack.categoryId))
    : []
  const domain = cat?.name ?? 'general'

  const existing = await db()
    .select({ entryType: packEntries.entryType, title: packEntries.title })
    .from(packEntries)
    .where(eq(packEntries.packVersionId, versionId))

  let created = 0
  for (const doc of docs) {
    if (!doc.extractedText || doc.textExtractionStatus !== 'completed') continue
    try {
      const drafts = await extractPackEntries({
        domain,
        documentText: doc.extractedText,
        documentName: doc.filename,
        existingEntries: existing,
      })
      for (const d of drafts) {
        await db()
          .insert(proposedEntries)
          .values({
            packVersionId: versionId,
            sourceDocumentId: doc.id,
            entryType: d.entryType,
            title: d.title,
            content: d.content,
            structuredData: d.structuredData ?? null,
            confidence: d.confidence,
            sourceExcerpt: d.sourceExcerpt,
            suggestedTags: d.suggestedTags,
          })
        created++
      }
    } catch (err: unknown) {
      console.error('ingestion error for doc', doc.id, err)
    }
  }

  await withAudit(
    {
      organizationId: pack.organizationId,
      userId: ctx.user.id,
      ipAddress: await ip(),
      userAgent: await ua(),
    },
    {
      entityType: 'pack_version',
      entityId: version.id,
      action: 'ingestion_run',
      afterState: { documentCount: docs.length, proposalsCreated: created },
    },
  )

  revalidatePath(`/dashboard/packs/${pack.id}/versions/${version.id}/ingest`)
  return { created }
}

export async function acceptProposal(
  proposalId: string,
  overrides?: { title?: string; content?: string; tags?: string[] },
): Promise<{ ok: true; entryId: string } | { error: string }> {
  const ctx = await requireOrgContext()
  const [join] = await db()
    .select({ proposal: proposedEntries, version: packVersions, pack: packs })
    .from(proposedEntries)
    .innerJoin(packVersions, eq(proposedEntries.packVersionId, packVersions.id))
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(eq(proposedEntries.id, proposalId))
  if (!join || join.pack.organizationId !== ctx.organization.id) return { error: 'Not found' }
  if (join.version.status === 'published' || join.version.status === 'archived')
    return { error: 'Version is locked' }
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')))
    return { error: 'Not authorized' }
  if (join.proposal.status !== 'pending_review') return { error: 'Already actioned' }

  const [last] = await db()
    .select({ max: sql<number>`coalesce(max(${packEntries.orderIndex}), -1)` })
    .from(packEntries)
    .where(eq(packEntries.packVersionId, join.version.id))
  const nextOrder = (last?.max ?? -1) + 1

  let entryId: string | undefined
  await db().transaction(async (tx) => {
    const [e] = await tx
      .insert(packEntries)
      .values({
        packVersionId: join.version.id,
        entryType: join.proposal.entryType,
        title: overrides?.title ?? join.proposal.title,
        content: overrides?.content ?? join.proposal.content,
        structuredData: join.proposal.structuredData,
        tags: overrides?.tags ?? join.proposal.suggestedTags,
        orderIndex: nextOrder,
      })
      .returning()
    if (!e) throw new Error('Entry insert failed')
    entryId = e.id

    await tx
      .update(proposedEntries)
      .set({
        status: overrides ? 'edited' : 'accepted',
        acceptedAsEntryId: e.id,
      })
      .where(eq(proposedEntries.id, proposalId))
  })

  if (!entryId) return { error: 'Insert failed' }
  await withAudit(
    {
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      ipAddress: await ip(),
      userAgent: await ua(),
    },
    {
      entityType: 'proposed_entry',
      entityId: proposalId,
      action: overrides ? 'edited_and_accepted' : 'accepted',
      afterState: { entryId },
    },
  )
  revalidatePath(`/dashboard/packs/${join.pack.id}/versions/${join.version.id}/ingest`)
  return { ok: true, entryId }
}

export async function rejectProposal(proposalId: string, reason?: string): Promise<void> {
  const ctx = await requireOrgContext()
  const [proposal] = await db()
    .select()
    .from(proposedEntries)
    .where(eq(proposedEntries.id, proposalId))
  if (!proposal) return
  await db()
    .update(proposedEntries)
    .set({ status: 'rejected', rejectionReason: reason })
    .where(eq(proposedEntries.id, proposalId))

  const [v] = await db()
    .select()
    .from(packVersions)
    .where(eq(packVersions.id, proposal.packVersionId))
  if (v) revalidatePath(`/dashboard/packs/${v.packId}/versions/${v.id}/ingest`)
  void ctx
}

export interface ProposalForUI extends ProposedEntry {
  documentName: string | null
}

export async function listProposalsForUI(versionId: string): Promise<ProposalForUI[]> {
  const rows = await db()
    .select({ proposal: proposedEntries, docName: sourceDocuments.filename })
    .from(proposedEntries)
    .leftJoin(sourceDocuments, eq(proposedEntries.sourceDocumentId, sourceDocuments.id))
    .where(eq(proposedEntries.packVersionId, versionId))
    .orderBy(asc(proposedEntries.createdAt))
  return rows.map((r) => ({ ...r.proposal, documentName: r.docName ?? null }))
}

async function ip(): Promise<string | null> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
async function ua(): Promise<string | null> {
  const h = await headers()
  return h.get('user-agent') ?? null
}
