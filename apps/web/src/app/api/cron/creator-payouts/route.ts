import { NextResponse } from 'next/server'
import { eq, gte, sql, sum } from 'drizzle-orm'
import { creatorPayouts, creatorRevenueEvents } from '@hyperspeed/db/schema'
import { db } from '@/lib/db'
import { captureException } from '@/lib/observability'

export const dynamic = 'force-dynamic'

const PLATFORM_FEE_BPS = 3000 // 30% (creator gets the remaining 70%)

/**
 * Phase 8.2 monthly creator payouts.
 * Aggregates last month's creator_revenue_events per creator, computes the
 * 70/30 split, and creates a pending creator_payouts row. The Stripe Connect
 * transfer happens once SUPABASE_SERVICE_ROLE_KEY + STRIPE_SECRET_KEY are set.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? ''}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const now = new Date()
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 1, 1)
  const periodEndStr = periodEnd.toISOString().slice(0, 10)
  const periodStartStr = periodStart.toISOString().slice(0, 10)

  try {
    const rows = await db()
      .select({
        creatorUserId: creatorRevenueEvents.creatorUserId,
        gross: sql<number>`coalesce(sum(${creatorRevenueEvents.amountCents}), 0)::int`,
      })
      .from(creatorRevenueEvents)
      .where(
        sql`${creatorRevenueEvents.createdAt} >= ${periodStart} AND ${creatorRevenueEvents.createdAt} < ${periodEnd}`,
      )
      .groupBy(creatorRevenueEvents.creatorUserId)

    let payouts = 0
    for (const r of rows) {
      if (r.gross <= 0) continue
      const platformFee = Math.floor((r.gross * PLATFORM_FEE_BPS) / 10000)
      const net = r.gross - platformFee
      await db().insert(creatorPayouts).values({
        creatorUserId: r.creatorUserId,
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        grossRevenueCents: r.gross,
        platformFeeCents: platformFee,
        netPayoutCents: net,
        status: 'pending',
      })
      payouts++
    }

    void eq
    void gte
    void sum
    return NextResponse.json({
      ok: true,
      payouts,
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
    })
  } catch (err) {
    await captureException(err, { extra: { job: 'creator-payouts' } })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'cron failed' },
      { status: 500 },
    )
  }
}
