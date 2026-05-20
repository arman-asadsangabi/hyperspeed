import { eq } from 'drizzle-orm'
import { subscriptionPlans, users, organizationMembers } from '@hyperspeed/db/schema'
import { db } from '@hyperspeed/db/client'
import { HttpError } from './auth'

const ACTIVE_STATUSES = new Set(['active', 'trialing'])

/**
 * Gates runtime queries on an active subscription.
 *
 * Bypass paths (no payment needed):
 *   - Org has any platform-admin member (founding / operator accounts).
 *   - Subscription is in active/trialing state.
 *
 * Returns silently if the org may query; throws HttpError(402) otherwise.
 */
export async function requireActiveSubscription(orgId: string): Promise<void> {
  // Platform-admin bypass — any platform-admin member of the org grants access.
  const adminCheck = await db()
    .select({ isPlatformAdmin: users.isPlatformAdmin })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, orgId))
  if (adminCheck.some((a) => a.isPlatformAdmin)) return

  const [sub] = await db()
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.organizationId, orgId))

  if (!sub || !ACTIVE_STATUSES.has(sub.status)) {
    throw new HttpError(
      402,
      'subscription_required',
      'This organization does not have an active subscription. Subscribe at https://www.hyperspeed.work/dashboard/billing.',
    )
  }
}
