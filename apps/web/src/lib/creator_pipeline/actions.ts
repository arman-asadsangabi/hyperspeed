'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, gte, sql, sum } from 'drizzle-orm'
import {
  creatorInvitations,
  creatorPayouts,
  creatorRevenueEvents,
  packs,
  type CreatorInvitation,
} from '@hyperspeed/db/schema'
import { db } from '../db'
import { requireSessionUser } from '../auth/session'
import { isPlatformAdmin } from '../creators/actions'

export async function createCreatorInvitation(
  email: string | undefined,
  targetDomain: string | undefined,
): Promise<{ inviteCode: string; expiresAt: Date } | { error: string }> {
  const u = await requireSessionUser()
  if (!(await isPlatformAdmin(u.id))) return { error: 'Platform admin only' }

  const code = randomCode(12)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
  const [row] = await db()
    .insert(creatorInvitations)
    .values({
      inviteCode: code,
      email,
      targetDomain,
      invitedBy: u.id,
      expiresAt,
    })
    .returning()
  if (!row) return { error: 'Insert failed' }
  revalidatePath('/dashboard/admin/creators')
  return { inviteCode: row.inviteCode, expiresAt: row.expiresAt }
}

export async function listInvitations(): Promise<CreatorInvitation[]> {
  const u = await requireSessionUser()
  if (!(await isPlatformAdmin(u.id))) throw new Error('Platform admin only')
  return db().select().from(creatorInvitations).orderBy(desc(creatorInvitations.createdAt))
}

export interface CreatorEarnings {
  monthGrossCents: number
  lifetimeGrossCents: number
  byPack: { packId: string; packName: string; cents: number }[]
  recentPayouts: (typeof creatorPayouts.$inferSelect)[]
}

export async function getMyEarnings(): Promise<CreatorEarnings> {
  const u = await requireSessionUser()
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const monthRows = await db()
    .select({ total: sql<number>`coalesce(sum(amount_cents), 0)::int` })
    .from(creatorRevenueEvents)
    .where(
      and(
        eq(creatorRevenueEvents.creatorUserId, u.id),
        gte(creatorRevenueEvents.createdAt, startOfMonth),
      ),
    )
  const totalRows = await db()
    .select({ total: sql<number>`coalesce(sum(amount_cents), 0)::int` })
    .from(creatorRevenueEvents)
    .where(eq(creatorRevenueEvents.creatorUserId, u.id))
  const byPack = await db()
    .select({
      packId: creatorRevenueEvents.packId,
      packName: packs.name,
      cents: sql<number>`coalesce(sum(amount_cents), 0)::int`,
    })
    .from(creatorRevenueEvents)
    .innerJoin(packs, eq(creatorRevenueEvents.packId, packs.id))
    .where(eq(creatorRevenueEvents.creatorUserId, u.id))
    .groupBy(creatorRevenueEvents.packId, packs.name)
    .orderBy(desc(sql`sum(amount_cents)`))

  const recentPayouts = await db()
    .select()
    .from(creatorPayouts)
    .where(eq(creatorPayouts.creatorUserId, u.id))
    .orderBy(desc(creatorPayouts.periodStart))
    .limit(12)

  return {
    monthGrossCents: monthRows[0]?.total ?? 0,
    lifetimeGrossCents: totalRows[0]?.total ?? 0,
    byPack: byPack.map((b) => ({ packId: b.packId, packName: b.packName, cents: b.cents })),
    recentPayouts,
  }
}

function randomCode(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

void sum
