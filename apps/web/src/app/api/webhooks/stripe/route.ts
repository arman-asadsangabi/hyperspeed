import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { subscriptionPlans } from '@hyperspeed/db/schema'
import { db } from '@/lib/db'
import { getStripe, WEBHOOK_SECRET } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * Stripe webhook receiver. Mirrors subscription state into subscription_plans.
 *
 * Set the endpoint at https://www.hyperspeed.work/api/webhooks/stripe in
 * Stripe Dashboard → Developers → Webhooks, listening for:
 *   - checkout.session.completed
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_failed
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET not set' }, { status: 500 })
  }
  const sig = request.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })

  const raw = await request.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, WEBHOOK_SECRET)
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${err instanceof Error ? err.message : err}` },
      { status: 400 },
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId =
          (session.client_reference_id as string | null) ??
          (session.metadata?.organization_id as string | undefined)
        if (orgId && typeof session.subscription === 'string') {
          await upsert(orgId, {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription,
            status: 'active',
            planType: 'student',
          })
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const orgId = (sub.metadata?.organization_id as string | undefined) ?? null
        // Fall back to looking up by customer id if metadata is missing.
        let targetOrgId = orgId
        if (!targetOrgId) {
          const [row] = await db()
            .select()
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.stripeCustomerId, sub.customer as string))
          targetOrgId = row?.organizationId ?? null
        }
        if (targetOrgId) {
          await upsert(targetOrgId, {
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
            status: sub.status,
            planType: 'student',
          })
        }
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        if (typeof inv.customer === 'string') {
          await db()
            .update(subscriptionPlans)
            .set({ status: 'past_due', updatedAt: new Date() })
            .where(eq(subscriptionPlans.stripeCustomerId, inv.customer))
        }
        break
      }
      default:
        // Unhandled event types are ack'd as 200 so Stripe stops retrying.
        break
    }
  } catch (err) {
    console.error('[webhook] processing error', event.type, err)
    return NextResponse.json({ error: 'processing_error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function upsert(
  orgId: string,
  patch: {
    stripeCustomerId: string
    stripeSubscriptionId: string
    status: string
    planType: string
  },
): Promise<void> {
  const [existing] = await db()
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.organizationId, orgId))
  if (existing) {
    await db()
      .update(subscriptionPlans)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(subscriptionPlans.organizationId, orgId))
  } else {
    await db()
      .insert(subscriptionPlans)
      .values({
        organizationId: orgId,
        ...patch,
      })
  }
}
