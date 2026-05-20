import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { subscriptionPlans } from '@hyperspeed/db/schema'
import { db } from '@/lib/db'
import { getStripe, STUDENT_PRICE_ID } from '@/lib/stripe'
import { requireOrgContext } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

/**
 * Start a Stripe Checkout session for the $5/mo student plan.
 * POST /api/billing/checkout — returns { url } pointing at Stripe Checkout.
 */
export async function POST(): Promise<NextResponse> {
  if (!STUDENT_PRICE_ID) {
    return NextResponse.json(
      { error: 'STRIPE_STUDENT_PRICE_ID is not configured' },
      { status: 500 },
    )
  }
  const ctx = await requireOrgContext()
  const stripe = getStripe()

  // Reuse an existing customer if we have one (handles re-subscribe).
  const [existing] = await db()
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.organizationId, ctx.organization.id))
  let customerId = existing?.stripeCustomerId ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.organization.billingEmail ?? ctx.user.email,
      name: ctx.organization.name,
      metadata: { organization_id: ctx.organization.id },
    })
    customerId = customer.id

    if (existing) {
      await db()
        .update(subscriptionPlans)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(subscriptionPlans.organizationId, ctx.organization.id))
    } else {
      await db().insert(subscriptionPlans).values({
        organizationId: ctx.organization.id,
        planType: 'student',
        stripeCustomerId: customerId,
        status: 'incomplete',
      })
    }
  }

  const base = process.env.WEB_APP_URL ?? 'https://www.hyperspeed.work'
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: STUDENT_PRICE_ID, quantity: 1 }],
    success_url: `${base}/dashboard/billing?status=success`,
    cancel_url: `${base}/dashboard/billing?status=cancel`,
    allow_promotion_codes: true,
    client_reference_id: ctx.organization.id,
    metadata: { organization_id: ctx.organization.id, user_id: ctx.user.id },
  })

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
  }
  return NextResponse.json({ url: session.url })
}
