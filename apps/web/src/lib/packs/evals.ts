'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import {
  evalRuns,
  evalResults,
  testSets,
  testCases,
  packs,
  packVersions,
  packEntries,
  categories,
  type EvalRun,
} from '@hyperspeed/db/schema'
import {
  aggregate,
  isAnthropicConfigured,
  PUBLISH_GATE_CONFIG,
  runEvalCases,
  ANTHROPIC_MODEL,
  ANTHROPIC_JUDGE_MODEL,
} from '@hyperspeed/eval'
import { db } from '../db'
import { hasRoleAtLeast, requireOrgContext } from '../auth/session'
import { withAudit } from '../audit'

export async function listTestSetsForCategory(categoryId: string | null) {
  if (categoryId) {
    return db()
      .select()
      .from(testSets)
      .where(and(eq(testSets.categoryId, categoryId), eq(testSets.isActive, true)))
      .orderBy(testSets.name)
  }
  return db().select().from(testSets).where(eq(testSets.isActive, true)).orderBy(testSets.name)
}

export async function startEvalRun(
  versionId: string,
  testSetId: string,
  numJudges = 1,
): Promise<{ ok: true; runId: string } | { error: string }> {
  const ctx = await requireOrgContext()
  const [row] = await db()
    .select({ version: packVersions, pack: packs })
    .from(packVersions)
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(and(eq(packVersions.id, versionId), eq(packs.organizationId, ctx.organization.id)))
  if (!row) return { error: 'Version not found' }
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')))
    return { error: 'Not authorized' }
  if (!isAnthropicConfigured()) return { error: 'ANTHROPIC_API_KEY is not set' }

  const [run] = await db()
    .insert(evalRuns)
    .values({
      packVersionId: versionId,
      testSetId,
      modelName: ANTHROPIC_MODEL,
      judgeModel: ANTHROPIC_JUDGE_MODEL,
      status: 'running',
      startedAt: new Date(),
      createdBy: ctx.user.id,
    })
    .returning()
  if (!run) return { error: 'Insert failed' }

  // Run inline (no background queue yet)
  try {
    const cases = await db().select().from(testCases).where(eq(testCases.testSetId, testSetId))
    const entries = await db()
      .select({
        id: packEntries.id,
        entryType: packEntries.entryType,
        title: packEntries.title,
        content: packEntries.content,
      })
      .from(packEntries)
      .where(eq(packEntries.packVersionId, versionId))

    const [cat] = row.pack.categoryId
      ? await db().select().from(categories).where(eq(categories.id, row.pack.categoryId))
      : []

    const results = await runEvalCases({
      domain: cat?.name ?? 'general',
      entries,
      testCases: cases.map((c) => ({
        id: c.id,
        prompt: c.prompt,
        expectedTopics: c.expectedTopics,
        expectedCitations: c.expectedCitations,
      })),
      numJudges,
    })

    if (results.length > 0) {
      await db()
        .insert(evalResults)
        .values(
          results.map((r) => {
            const { reasoning, ...numericScores } = r.scores
            return {
              evalRunId: run.id,
              testCaseId: r.testCaseId,
              response: r.response,
              citationsUsed: r.citationsUsed,
              judgeScores: numericScores as Record<string, number>,
              judgeReasoning: reasoning,
              latencyMs: r.latencyMs,
            }
          }),
        )
    }

    const agg = aggregate(results)
    await db()
      .update(evalRuns)
      .set({
        status: 'completed',
        completedAt: new Date(),
        overallScore: String(agg.overall),
        dimensionScores: agg.dimensions,
      })
      .where(eq(evalRuns.id, run.id))

    await withAudit(
      {
        organizationId: row.pack.organizationId,
        userId: ctx.user.id,
        ipAddress: await ip(),
        userAgent: await ua(),
      },
      {
        entityType: 'eval_run',
        entityId: run.id,
        action: 'completed',
        afterState: { overall: agg.overall, dimensions: agg.dimensions },
      },
    )
  } catch (err: unknown) {
    await db()
      .update(evalRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      })
      .where(eq(evalRuns.id, run.id))
    return { error: err instanceof Error ? err.message : 'Eval failed' }
  }

  revalidatePath(`/dashboard/packs/${row.pack.id}/versions/${versionId}`)
  return { ok: true, runId: run.id }
}

export async function listEvalRuns(versionId: string): Promise<EvalRun[]> {
  return db()
    .select()
    .from(evalRuns)
    .where(eq(evalRuns.packVersionId, versionId))
    .orderBy(desc(evalRuns.createdAt))
}

export async function getEvalRun(runId: string) {
  const [run] = await db().select().from(evalRuns).where(eq(evalRuns.id, runId))
  if (!run) return null
  const results = await db()
    .select({
      result: evalResults,
      testCase: testCases,
    })
    .from(evalResults)
    .innerJoin(testCases, eq(evalResults.testCaseId, testCases.id))
    .where(eq(evalResults.evalRunId, runId))
    .orderBy(asc(evalResults.createdAt))
  return { run, results }
}

export async function getLatestEvalRun(versionId: string): Promise<EvalRun | null> {
  const [run] = await db()
    .select()
    .from(evalRuns)
    .where(and(eq(evalRuns.packVersionId, versionId), eq(evalRuns.status, 'completed')))
    .orderBy(desc(evalRuns.completedAt))
    .limit(1)
  return run ?? null
}

export interface EvalGate {
  passed: boolean
  reason?: string
  overallScore?: number
  dimensions?: Record<string, number>
}

/**
 * Returns whether the latest completed eval for this version meets the publish gate.
 * Wired into publishVersion in Phase 4.4.
 */
export async function checkEvalGate(versionId: string): Promise<EvalGate> {
  const run = await getLatestEvalRun(versionId)
  if (!run) return { passed: false, reason: 'No completed eval run for this version' }
  if (run.status !== 'completed') return { passed: false, reason: `Last run status: ${run.status}` }

  const overall = Number(run.overallScore ?? 0)
  const dims = run.dimensionScores ?? {}
  if (overall < PUBLISH_GATE_CONFIG.overall)
    return {
      passed: false,
      reason: `Overall ${overall} < ${PUBLISH_GATE_CONFIG.overall}`,
      overallScore: overall,
      dimensions: dims,
    }
  if ((dims.accuracy ?? 0) < PUBLISH_GATE_CONFIG.accuracy)
    return {
      passed: false,
      reason: `Accuracy ${dims.accuracy} < ${PUBLISH_GATE_CONFIG.accuracy}`,
      overallScore: overall,
      dimensions: dims,
    }
  if ((dims.citation_coverage ?? 0) < PUBLISH_GATE_CONFIG.citation_coverage)
    return {
      passed: false,
      reason: `Citation coverage ${dims.citation_coverage} < ${PUBLISH_GATE_CONFIG.citation_coverage}`,
      overallScore: overall,
      dimensions: dims,
    }
  if ((dims.hallucination_rate ?? 100) > PUBLISH_GATE_CONFIG.hallucination_rate)
    return {
      passed: false,
      reason: `Hallucination ${dims.hallucination_rate} > ${PUBLISH_GATE_CONFIG.hallucination_rate}`,
      overallScore: overall,
      dimensions: dims,
    }
  if ((dims.response_quality ?? 0) < PUBLISH_GATE_CONFIG.response_quality)
    return {
      passed: false,
      reason: `Response quality ${dims.response_quality} < ${PUBLISH_GATE_CONFIG.response_quality}`,
      overallScore: overall,
      dimensions: dims,
    }
  return { passed: true, overallScore: overall, dimensions: dims }
}

async function ip(): Promise<string | null> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
async function ua(): Promise<string | null> {
  const h = await headers()
  return h.get('user-agent') ?? null
}

// Reference unused imports so they survive tree-shaking checks during typecheck
void sql
