'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import {
  packEntries,
  packVersions,
  packs,
  lintResults,
  entryCitations,
  categories,
  type LintResult,
} from '@hyperspeed/db/schema'
import { runAllChecks, computeHealthScore, type LintEntry } from '@hyperspeed/eval'
import { db } from '../db'
import { hasRoleAtLeast, requireOrgContext } from '../auth/session'
import { withAudit } from '../audit'

export interface PackHealth {
  score: number
  findings: LintResult[]
  errorCount: number
  warningCount: number
  infoCount: number
}

export async function runLint(
  versionId: string,
): Promise<{ ok: true; findings: number } | { error: string }> {
  const ctx = await requireOrgContext()
  const [row] = await db()
    .select({ version: packVersions, pack: packs })
    .from(packVersions)
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(and(eq(packVersions.id, versionId), eq(packs.organizationId, ctx.organization.id)))
  if (!row) return { error: 'Not found' }
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')))
    return { error: 'Not authorized' }

  const entries = await db()
    .select()
    .from(packEntries)
    .where(eq(packEntries.packVersionId, versionId))
  const citationLinks = await db()
    .select({ packEntryId: entryCitations.packEntryId })
    .from(entryCitations)
  const hasCitationSet = new Set(citationLinks.map((c) => c.packEntryId))
  const [cat] = row.pack.categoryId
    ? await db().select().from(categories).where(eq(categories.id, row.pack.categoryId))
    : []

  const lintEntries: LintEntry[] = entries.map((e) => ({
    id: e.id,
    entryType: e.entryType,
    title: e.title,
    content: e.content,
    tags: e.tags,
    hasCitation: hasCitationSet.has(e.id),
  }))

  const findings = await runAllChecks(lintEntries, cat?.name ?? 'general')

  // Clear previous unresolved findings + insert new
  await db().transaction(async (tx) => {
    await tx
      .delete(lintResults)
      .where(and(eq(lintResults.packVersionId, versionId), eq(lintResults.resolved, false)))
    if (findings.length > 0) {
      await tx.insert(lintResults).values(
        findings.map((f) => ({
          packVersionId: versionId,
          entryId: f.entryId ?? null,
          checkType: f.checkType,
          severity: f.severity,
          message: f.message,
          suggestedFix: f.suggestedFix,
        })),
      )
    }
  })

  await withAudit(
    {
      organizationId: row.pack.organizationId,
      userId: ctx.user.id,
      ipAddress: await ip(),
      userAgent: await ua(),
    },
    {
      entityType: 'pack_version',
      entityId: versionId,
      action: 'lint_run',
      afterState: { findings: findings.length },
    },
  )

  revalidatePath(`/dashboard/packs/${row.pack.id}/versions/${versionId}`)
  return { ok: true, findings: findings.length }
}

export async function getPackHealth(versionId: string): Promise<PackHealth> {
  const findings = await db()
    .select()
    .from(lintResults)
    .where(and(eq(lintResults.packVersionId, versionId), eq(lintResults.resolved, false)))
  const allEntries = await db()
    .select({ id: packEntries.id })
    .from(packEntries)
    .where(eq(packEntries.packVersionId, versionId))
  const total = allEntries.length

  const score = computeHealthScore(
    findings.map((f) => ({
      severity: f.severity,
      checkType: f.checkType,
      message: f.message,
      entryId: f.entryId,
    })),
    total,
  )

  return {
    score,
    findings,
    errorCount: findings.filter((f) => f.severity === 'error').length,
    warningCount: findings.filter((f) => f.severity === 'warning').length,
    infoCount: findings.filter((f) => f.severity === 'info').length,
  }
}

export async function resolveFinding(findingId: string): Promise<void> {
  const ctx = await requireOrgContext()
  await db().update(lintResults).set({ resolved: true }).where(eq(lintResults.id, findingId))
  void ctx
}

async function ip(): Promise<string | null> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
async function ua(): Promise<string | null> {
  const h = await headers()
  return h.get('user-agent') ?? null
}
