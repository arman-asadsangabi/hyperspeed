import { redirect } from 'next/navigation'
import { requireSessionUser } from '@/lib/auth/session'
import { isPlatformAdmin } from '@/lib/creators/actions'
import { listApplications } from '@/lib/design_partners/actions'
import { ApplicationRow } from './application-row'

export const dynamic = 'force-dynamic'

export default async function AdminApplicationsPage() {
  const u = await requireSessionUser()
  if (!(await isPlatformAdmin(u.id))) redirect('/dashboard')
  const apps = await listApplications()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Design partner applications
        </h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          {apps.length} applications total. {apps.filter((a) => a.status === 'new').length} new.
        </p>
      </div>
      {apps.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--color-border-base)] bg-white p-10 text-center text-sm text-[var(--color-slate-soft)]">
          No applications yet.
        </p>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <ApplicationRow key={a.id} application={a} />
          ))}
        </div>
      )}
    </div>
  )
}
