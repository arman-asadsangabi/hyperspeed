import Link from 'next/link'
import { hasRoleAtLeast, requireOrgContext } from '@/lib/auth/session'
import { listApiKeys } from '@/lib/api_keys/actions'
import { getUsageSummary } from '@/lib/usage/actions'

export const dynamic = 'force-dynamic'

export default async function ApiOverviewPage() {
  const ctx = await requireOrgContext()
  const [keys, usage, canManage] = await Promise.all([
    listApiKeys(),
    getUsageSummary(),
    hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin'),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">API</h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Manage API keys, monitor usage, and read documentation.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Queries this month" value={usage.totalThisMonth.toLocaleString()} />
        <Stat label="Queries today" value={usage.totalToday.toLocaleString()} />
        <Stat label="Active keys" value={String(keys.length)} />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/api/keys"
          className="rounded-lg border border-[var(--color-border-base)] bg-white p-5 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]"
        >
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">API keys</h2>
          <p className="mt-1 text-xs text-[var(--color-slate-soft)]">
            Create, rotate, and revoke keys. {canManage ? '' : '(Admin-only)'}
          </p>
        </Link>
        <Link
          href="/dashboard/api/usage"
          className="rounded-lg border border-[var(--color-border-base)] bg-white p-5 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]"
        >
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Usage analytics</h2>
          <p className="mt-1 text-xs text-[var(--color-slate-soft)]">
            Per-key breakdown, daily counts, error rate.
          </p>
        </Link>
        <Link
          href="/dashboard/api/docs"
          className="rounded-lg border border-[var(--color-border-base)] bg-white p-5 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]"
        >
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Documentation</h2>
          <p className="mt-1 text-xs text-[var(--color-slate-soft)]">Quickstart, endpoints, SDK.</p>
        </Link>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-base)] bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-[var(--color-slate-soft)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">{value}</div>
    </div>
  )
}
