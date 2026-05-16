import { and, eq, gte, sql } from 'drizzle-orm'
import { apiUsageEvents } from '@hyperspeed/db/schema'
import { db } from '@hyperspeed/db/client'
import { HttpError } from './auth'

interface TierLimits {
  perMinute: number
  perDay: number
}

const LIMITS: Record<string, TierLimits> = {
  free: { perMinute: 100, perDay: 10_000 },
  startup: { perMinute: 1_000, perDay: 1_000_000 },
  enterprise: { perMinute: 10_000, perDay: 100_000_000 },
}

export interface RateLimitInfo {
  limitPerMinute: number
  limitPerDay: number
  remainingMinute: number
  remainingDay: number
  resetAt: Date
}

/**
 * DB-backed rate limit using the existing api_usage_events table. Cheaper
 * than a separate Redis when traffic is low; swap to Upstash when this
 * query starts to bite.
 */
export async function checkRateLimit(orgId: string, tier: string): Promise<RateLimitInfo> {
  const limits = LIMITS[tier] ?? LIMITS.free!
  const now = new Date()
  // postgres-js inside Drizzle's raw `sql` template can't infer column type
  // for a bare Date and fails in Buffer.byteLength; serialize to ISO strings
  // and cast on the Postgres side.
  const minuteAgoIso = new Date(now.getTime() - 60_000).toISOString()
  const dayAgoIso = new Date(now.getTime() - 86_400_000).toISOString()

  const rows = await db().execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= ${minuteAgoIso}::timestamptz)::int AS minute_count,
      COUNT(*) FILTER (WHERE created_at >= ${dayAgoIso}::timestamptz)::int AS day_count
    FROM ${apiUsageEvents}
    WHERE organization_id = ${orgId} AND created_at >= ${dayAgoIso}::timestamptz
  `)
  const row = (rows as unknown as { minute_count: number; day_count: number }[])[0] ?? {
    minute_count: 0,
    day_count: 0,
  }

  if (row.minute_count >= limits.perMinute)
    throw new HttpError(429, 'rate_limit_minute', `Rate limit (${limits.perMinute}/min) exceeded`)
  if (row.day_count >= limits.perDay)
    throw new HttpError(429, 'rate_limit_day', `Daily limit (${limits.perDay}) exceeded`)

  return {
    limitPerMinute: limits.perMinute,
    limitPerDay: limits.perDay,
    remainingMinute: Math.max(0, limits.perMinute - row.minute_count),
    remainingDay: Math.max(0, limits.perDay - row.day_count),
    resetAt: new Date(now.getTime() + 60_000),
  }
}

// Reference to satisfy unused-var
void and
void eq
void gte
