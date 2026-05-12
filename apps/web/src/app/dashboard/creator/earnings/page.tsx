import { getMyEarnings } from '@/lib/creator_pipeline/actions'

export const dynamic = 'force-dynamic'

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function CreatorEarningsPage() {
  const e = await getMyEarnings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Earnings</h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Pre-tax revenue attributed to your packs. Payouts run on the 1st of each month at 70/30
          split.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="This month (gross)" value={dollars(e.monthGrossCents)} />
        <Stat label="Lifetime (gross)" value={dollars(e.lifetimeGrossCents)} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
          By pack
        </h2>
        {e.byPack.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border-base)] bg-white p-6 text-center text-sm text-[var(--color-slate-soft)]">
            No revenue yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Pack
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-[var(--color-slate-soft)]">
                    Gross
                  </th>
                </tr>
              </thead>
              <tbody>
                {e.byPack.map((p) => (
                  <tr key={p.packId} className="border-t border-[var(--color-border-base)]">
                    <td className="px-4 py-2 text-[var(--color-ink)]">{p.packName}</td>
                    <td className="px-4 py-2 text-right font-mono text-[var(--color-ink)]">
                      {dollars(p.cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
          Recent payouts
        </h2>
        {e.recentPayouts.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border-base)] bg-white p-6 text-center text-sm text-[var(--color-slate-soft)]">
            No payouts yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Period
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-[var(--color-slate-soft)]">
                    Net
                  </th>
                </tr>
              </thead>
              <tbody>
                {e.recentPayouts.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--color-border-base)]">
                    <td className="px-4 py-2 text-[var(--color-ink)]">
                      {p.periodStart} → {p.periodEnd}
                    </td>
                    <td className="px-4 py-2 text-[var(--color-slate-soft)]">{p.status}</td>
                    <td className="px-4 py-2 text-right font-mono text-[var(--color-ink)]">
                      {dollars(p.netPayoutCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
