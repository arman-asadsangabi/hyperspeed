export const dynamic = 'force-dynamic'

interface Check {
  name: string
  ok: boolean
  detail?: string
}

async function probeApi(): Promise<Check> {
  const url = (process.env.API_APP_URL ?? 'https://hyperspeed-api.vercel.app') + '/health'
  try {
    const res = await fetch(url, { cache: 'no-store', next: { revalidate: 0 } })
    const ok = res.ok
    return { name: 'API', ok, detail: ok ? `HTTP ${res.status}` : `HTTP ${res.status}` }
  } catch (e) {
    return { name: 'API', ok: false, detail: e instanceof Error ? e.message : 'unreachable' }
  }
}

async function probeDb(): Promise<Check> {
  try {
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')
    const rows = await db().execute(sql`SELECT 1 AS ok`)
    void rows
    return { name: 'Database', ok: true, detail: 'pooler reachable' }
  } catch (e) {
    return { name: 'Database', ok: false, detail: e instanceof Error ? e.message : 'unreachable' }
  }
}

export default async function StatusPage() {
  const [api, dbCheck] = await Promise.all([probeApi(), probeDb()])
  const allOk = api.ok && dbCheck.ok

  return (
    <main className="min-h-screen bg-white px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center">
          <div
            className={`inline-block h-3 w-3 rounded-full ${allOk ? 'bg-green-500' : 'bg-red-500'}`}
            aria-hidden
          />
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            {allOk ? 'All systems operational' : 'Service degraded'}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
            Public status of the Hyperspeed platform.
          </p>
        </header>

        <section className="divide-y divide-[var(--color-border-base)] rounded-lg border border-[var(--color-border-base)] bg-white">
          {[api, dbCheck].map((c) => (
            <div key={c.name} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    c.ok ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  aria-hidden
                />
                <span className="text-sm font-medium text-[var(--color-ink)]">{c.name}</span>
              </div>
              <span className="text-xs text-[var(--color-slate-soft)]">{c.detail}</span>
            </div>
          ))}
        </section>

        <p className="text-center text-xs text-[var(--color-slate-soft)]">
          Last checked: {new Date().toISOString()}
        </p>
      </div>
    </main>
  )
}
