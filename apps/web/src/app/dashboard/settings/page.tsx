import { requireOrgContext } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const ctx = await requireOrgContext()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Organization-level configuration.
        </p>
      </div>

      <section className="rounded-lg border border-[var(--color-border-base)] bg-white p-6">
        <h2 className="text-sm font-medium text-[var(--color-ink)]">Organization</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--color-slate-soft)]">Name</dt>
            <dd className="text-[var(--color-ink)]">{ctx.organization.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-slate-soft)]">Slug</dt>
            <dd className="font-mono text-[var(--color-ink)]">{ctx.organization.slug}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-slate-soft)]">Plan</dt>
            <dd className="text-[var(--color-ink)]">{ctx.organization.plan}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-slate-soft)]">Billing email</dt>
            <dd className="text-[var(--color-ink)]">{ctx.organization.billingEmail}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-slate-soft)]">Created</dt>
            <dd className="text-[var(--color-ink)]">
              {new Date(ctx.organization.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </section>

      <p className="text-xs text-[var(--color-slate-soft)]">
        Editing settings will be wired up in a later phase.
      </p>
    </div>
  )
}
