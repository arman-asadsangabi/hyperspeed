import { requireOrgContext } from '@/lib/auth/session'
import { getUsageSummary } from '@/lib/usage/actions'

export const dynamic = 'force-dynamic'

export default async function UsagePage() {
  await requireOrgContext()
  const summary = await getUsageSummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Usage analytics
        </h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">Month-to-date.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Queries" value={summary.totalThisMonth.toLocaleString()} />
        <Stat label="Today" value={summary.totalToday.toLocaleString()} />
        <Stat label="Error rate" value={`${(summary.errorRate * 100).toFixed(2)}%`} />
        <Stat label="Active keys" value={String(summary.byKey.length)} />
      </div>

      <Section title="By endpoint">
        <SimpleTable
          headers={['Endpoint', 'Count']}
          rows={summary.byEndpoint.map((e) => [e.endpoint, e.count.toLocaleString()])}
        />
      </Section>

      <Section title="By API key">
        <SimpleTable
          headers={['Key', 'Count']}
          rows={summary.byKey.map((k) => [k.keyName, k.count.toLocaleString()])}
        />
      </Section>

      <Section title="By day">
        <SimpleTable
          headers={['Day', 'Count']}
          rows={summary.byDay.map((d) => [d.day, d.count.toLocaleString()])}
        />
      </Section>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
        {title}
      </h2>
      {children}
    </section>
  )
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-6 text-center text-[var(--color-slate-soft)]"
              >
                No data yet.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-t border-[var(--color-border-base)]">
                {r.map((c, j) => (
                  <td
                    key={j}
                    className={
                      j === 0
                        ? 'px-4 py-2 text-[var(--color-ink)]'
                        : 'px-4 py-2 font-mono text-[var(--color-slate-soft)]'
                    }
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
