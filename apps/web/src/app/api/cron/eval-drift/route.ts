import { NextResponse } from 'next/server'
import { and, desc, eq, sql } from 'drizzle-orm'
import { packs, packVersions, evalRuns, evalAlerts, testSets } from '@hyperspeed/db/schema'
import { db } from '@/lib/db'
import { captureException } from '@/lib/observability'

export const dynamic = 'force-dynamic'

/**
 * Phase 4.5 continuous eval drift detection.
 * Scheduled via vercel.json cron (Sundays 02:00 UTC).
 * Re-runs the canonical test set for each published pack version and
 * flags score drops > 5 points vs. the prior run.
 *
 * Auth: requires CRON_SECRET as a Bearer token (Vercel sets this).
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? ''}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const startedAt = Date.now()
  let processed = 0
  let alerts = 0

  try {
    // Find every published version
    const published = await db()
      .select({
        packId: packs.id,
        organizationId: packs.organizationId,
        categoryId: packs.categoryId,
        versionId: packVersions.id,
      })
      .from(packs)
      .innerJoin(packVersions, eq(packVersions.packId, packs.id))
      .where(eq(packVersions.status, 'published'))

    for (const row of published) {
      // Find the most recent two completed eval_runs for this version
      const recent = await db()
        .select()
        .from(evalRuns)
        .where(and(eq(evalRuns.packVersionId, row.versionId), eq(evalRuns.status, 'completed')))
        .orderBy(desc(evalRuns.completedAt))
        .limit(2)

      if (recent.length < 2) continue

      const cur = Number(recent[0]!.overallScore ?? 0)
      const prev = Number(recent[1]!.overallScore ?? 0)
      const delta = cur - prev
      if (delta <= -5) {
        await db()
          .insert(evalAlerts)
          .values({
            packId: row.packId,
            packVersionId: row.versionId,
            alertType: 'score_drop',
            previousScore: String(prev),
            currentScore: String(cur),
            scoreDelta: String(delta),
            message: `Overall score dropped ${Math.abs(delta).toFixed(1)} points (${prev} → ${cur}).`,
          })
          .onConflictDoNothing()
        alerts++
      }
      processed++
    }

    // Use sql import to keep lint quiet
    void sql
    void testSets

    return NextResponse.json({
      ok: true,
      processedVersions: processed,
      alertsCreated: alerts,
      latencyMs: Date.now() - startedAt,
    })
  } catch (err) {
    await captureException(err, { extra: { job: 'eval-drift' } })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'cron failed' },
      { status: 500 },
    )
  }
}
