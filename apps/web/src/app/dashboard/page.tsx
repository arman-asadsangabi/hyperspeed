import { requireOrgContext } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { auditLog } from '@hyperspeed/db/schema'
import { desc, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const ctx = await requireOrgContext()

  const recent = await db()
    .select()
    .from(auditLog)
    .where(eq(auditLog.organizationId, ctx.organization.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(10)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          {ctx.organization.name}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          You&apos;re signed in as {ctx.role}. Plan: <strong>{ctx.organization.plan}</strong>.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
          Recent activity
        </h2>
        <div className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
          {recent.length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-slate-soft)]">No activity yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    When
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Entity
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--color-border-base)]">
                    <td className="px-4 py-2 text-[var(--color-slate-soft)]">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-[var(--color-ink)]">{row.entityType}</td>
                    <td className="px-4 py-2 text-[var(--color-ink)]">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
