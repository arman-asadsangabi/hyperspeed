import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { subscriptionPlans } from '@hyperspeed/db/schema'
import { db } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { requireOrgContext } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

/**
 * Redirect the user to Stripe's hosted Customer Portal where they can update
 * payment method, view invoices, or cancel.
 */
export async function POST(): Promise<NextResponse> {
  const ctx = await requireOrgContext()
  const [sub] = await db()
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.organizationId, ctx.organization.id))

  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No Stripe customer for this organization. Subscribe first.' },
      { status: 400 },
    )
  }

  const base = process.env.WEB_APP_URL ?? 'https://www.hyperspeed.work'
  const portal = await getStripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${base}/dashboard/billing`,
  })

  return NextResponse.json({ url: portal.url })
}
