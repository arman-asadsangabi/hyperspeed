import { redirect } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { requireOrgContext, hasRoleAtLeast } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { auditLog, users } from '@hyperspeed/db/schema'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{ offset?: string }>
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  const ctx = await requireOrgContext()
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin'))) {
    redirect('/dashboard')
  }

  const { offset: offsetParam } = await searchParams
  const offset = Math.max(0, Number(offsetParam ?? 0) || 0)

  const rows = await db()
    .select({
      id: auditLog.id,
      createdAt: auditLog.createdAt,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      action: auditLog.action,
      diff: auditLog.diff,
      userId: auditLog.userId,
      userEmail: users.email,
      userName: users.fullName,
      ipAddress: auditLog.ipAddress,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(eq(auditLog.organizationId, ctx.organization.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(PAGE_SIZE + 1)
    .offset(offset)

  const hasMore = rows.length > PAGE_SIZE
  const display = rows.slice(0, PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Audit log</h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Every mutation in your organization is recorded here.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                When
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Actor
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Entity
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Action
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Diff
              </th>
            </tr>
          </thead>
          <tbody>
            {display.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-slate-soft)]">
                  Nothing yet.
                </td>
              </tr>
            ) : (
              display.map((row) => (
                <tr key={row.id} className="border-t border-[var(--color-border-base)] align-top">
                  <td className="px-4 py-2 text-[var(--color-slate-soft)]">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-ink)]">
                    {row.userName ?? row.userEmail ?? 'system'}
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-[var(--color-ink)]">{row.entityType}</div>
                    <div className="font-mono text-xs text-[var(--color-slate-soft)]">
                      {row.entityId.slice(0, 8)}…
                    </div>
                  </td>
                  <td className="px-4 py-2 text-[var(--color-ink)]">{row.action}</td>
                  <td className="px-4 py-2">
                    {row.diff ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-[var(--color-primary)]">
                          view
                        </summary>
                        <pre className="mt-2 max-w-md overflow-x-auto rounded bg-[var(--color-primary-pale)] p-2 font-mono text-[10px] text-[var(--color-ink)]">
                          {JSON.stringify(row.diff, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-[var(--color-slate-soft)]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-slate-soft)]">
          Showing {display.length === 0 ? 0 : offset + 1}–{offset + display.length}
        </span>
        <div className="flex gap-2">
          {offset > 0 ? (
            <a
              href={`?offset=${Math.max(0, offset - PAGE_SIZE)}`}
              className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 text-[var(--color-ink)] hover:bg-[var(--color-primary-pale)]"
            >
              Previous
            </a>
          ) : null}
          {hasMore ? (
            <a
              href={`?offset=${offset + PAGE_SIZE}`}
              className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 text-[var(--color-ink)] hover:bg-[var(--color-primary-pale)]"
            >
              Next
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
