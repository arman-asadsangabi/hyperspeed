import { requireOrgContext } from '@/lib/auth/session'
import { getBillingState } from '@/lib/billing'
import { BillingControls } from './controls'

export const dynamic = 'force-dynamic'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const ctx = await requireOrgContext()
  const billing = await getBillingState(ctx.organization.id, ctx.user.id)
  const { status: queryStatus } = await searchParams

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Billing</h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          $5/month gives this organization unlimited API access to query Hyperspeed packs.
        </p>
      </div>

      {queryStatus === 'success' ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Subscription started. It can take a moment for Stripe to confirm — if the status below
          still shows <em>incomplete</em>, refresh in 10 seconds.
        </div>
      ) : null}
      {queryStatus === 'cancel' ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout cancelled. You can subscribe any time.
        </div>
      ) : null}

      <section className="rounded-xl border border-[var(--color-border-base)] bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
              Current plan
            </div>
            <div className="mt-1 text-xl font-semibold text-[var(--color-ink)]">
              {billing.isPlatformAdmin
                ? 'Platform admin (complimentary)'
                : billing.status === 'active' || billing.status === 'trialing'
                  ? 'Student — $5 / month'
                  : 'No active subscription'}
            </div>
            <div className="mt-2 text-sm text-[var(--color-slate-soft)]">
              Status:{' '}
              <span
                className={
                  billing.canQuery ? 'font-medium text-green-700' : 'font-medium text-amber-700'
                }
              >
                {billing.isPlatformAdmin ? 'platform-admin bypass' : billing.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-[var(--color-ink)]">
              {billing.canQuery
                ? 'You can query any pack your organization has access to.'
                : 'API queries are paused until a subscription is active.'}
            </p>
          </div>

          <BillingControls
            hasSubscription={!!billing.stripeSubscriptionId}
            canQuery={billing.canQuery}
          />
        </div>
      </section>

      <section className="rounded-xl border border-[var(--color-border-base)] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
          What you get
        </h2>
        <ul className="mt-4 grid gap-2 text-sm text-[var(--color-ink)] sm:grid-cols-2">
          <li>• Unlimited queries against any licensed pack</li>
          <li>• Works in ChatGPT, Claude Desktop, Cursor, MCP-aware tools</li>
          <li>• Direct API + TypeScript SDK access</li>
          <li>• Citations to the exact lecture / chapter the answer came from</li>
          <li>• Cancel anytime from the Stripe portal</li>
          <li>• Refunds within 7 days for accidental charges</li>
        </ul>
      </section>
    </div>
  )
}
