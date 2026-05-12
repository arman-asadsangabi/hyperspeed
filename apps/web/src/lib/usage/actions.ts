'use server'

import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { apiUsageEvents, apiKeys } from '@hyperspeed/db/schema'
import { db } from '../db'
import { requireOrgContext } from '../auth/session'

export interface UsageSummary {
  totalThisMonth: number
  totalToday: number
  byEndpoint: { endpoint: string; count: number }[]
  byDay: { day: string; count: number }[]
  byKey: { keyId: string | null; keyName: string; count: number }[]
  errorRate: number
}

export async function getUsageSummary(): Promise<UsageSummary> {
  const ctx = await requireOrgContext()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const monthRows = await db()
    .select({
      n: sql<number>`count(*)::int`,
      errors: sql<number>`count(*) filter (where status_code >= 400)::int`,
    })
    .from(apiUsageEvents)
    .where(
      and(
        eq(apiUsageEvents.organizationId, ctx.organization.id),
        gte(apiUsageEvents.createdAt, startOfMonth),
      ),
    )
  const totalThisMonth = monthRows[0]?.n ?? 0
  const errorRate = totalThisMonth === 0 ? 0 : (monthRows[0]!.errors ?? 0) / totalThisMonth

  const todayRows = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(apiUsageEvents)
    .where(
      and(
        eq(apiUsageEvents.organizationId, ctx.organization.id),
        gte(apiUsageEvents.createdAt, startOfDay),
      ),
    )
  const totalToday = todayRows[0]?.n ?? 0

  const byEp = await db()
    .select({ endpoint: apiUsageEvents.endpoint, count: sql<number>`count(*)::int` })
    .from(apiUsageEvents)
    .where(
      and(
        eq(apiUsageEvents.organizationId, ctx.organization.id),
        gte(apiUsageEvents.createdAt, startOfMonth),
      ),
    )
    .groupBy(apiUsageEvents.endpoint)
    .orderBy(desc(sql`count(*)`))
    .limit(10)

  const byDay = await db()
    .select({
      day: sql<string>`to_char(date_trunc('day', created_at), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(apiUsageEvents)
    .where(
      and(
        eq(apiUsageEvents.organizationId, ctx.organization.id),
        gte(apiUsageEvents.createdAt, startOfMonth),
      ),
    )
    .groupBy(sql`date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at)`)

  const byKey = await db()
    .select({
      keyId: apiUsageEvents.apiKeyId,
      keyName: apiKeys.name,
      count: sql<number>`count(*)::int`,
    })
    .from(apiUsageEvents)
    .leftJoin(apiKeys, eq(apiUsageEvents.apiKeyId, apiKeys.id))
    .where(
      and(
        eq(apiUsageEvents.organizationId, ctx.organization.id),
        gte(apiUsageEvents.createdAt, startOfMonth),
      ),
    )
    .groupBy(apiUsageEvents.apiKeyId, apiKeys.name)
    .orderBy(desc(sql`count(*)`))
    .limit(10)

  return {
    totalThisMonth,
    totalToday,
    byEndpoint: byEp.map((e) => ({ endpoint: e.endpoint, count: e.count })),
    byDay: byDay.map((d) => ({ day: d.day, count: d.count })),
    byKey: byKey.map((k) => ({
      keyId: k.keyId,
      keyName: k.keyName ?? 'Revoked key',
      count: k.count,
    })),
    errorRate,
  }
}
