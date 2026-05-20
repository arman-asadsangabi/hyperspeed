import { eq } from 'drizzle-orm'
import { subscriptionPlans, users } from '@hyperspeed/db/schema'
import { db } from './db'

export type BillingStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'trialing'
  | 'none'

export interface BillingState {
  status: BillingStatus
  planType: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  isPlatformAdmin: boolean
  canQuery: boolean
}

/**
 * Resolves the subscription state for an organization.
 *
 * Platform admins (the founding/operator account) bypass the paywall so the
 * team can keep testing and demoing without burning their own card. Everyone
 * else needs an active subscription to query the runtime API.
 */
export async function getBillingState(orgId: string, userId?: string): Promise<BillingState> {
  const [sub] = await db()
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.organizationId, orgId))

  let isPlatformAdmin = false
  if (userId) {
    const [u] = await db().select().from(users).where(eq(users.id, userId))
    isPlatformAdmin = !!u?.isPlatformAdmin
  }

  const status = (sub?.status as BillingStatus) ?? 'none'
  const canQuery = isPlatformAdmin || status === 'active' || status === 'trialing'

  return {
    status,
    planType: sub?.planType ?? 'free',
    stripeCustomerId: sub?.stripeCustomerId ?? null,
    stripeSubscriptionId: sub?.stripeSubscriptionId ?? null,
    isPlatformAdmin,
    canQuery,
  }
}
