import { redirect } from 'next/navigation'
import { adminListPendingCredentials, isPlatformAdmin } from '@/lib/creators/actions'
import { requireSessionUser } from '@/lib/auth/session'
import { CredentialReviewRow } from './review-row'

export const dynamic = 'force-dynamic'

export default async function AdminCredentialsPage() {
  const u = await requireSessionUser()
  if (!(await isPlatformAdmin(u.id))) redirect('/dashboard')

  const pending = await adminListPendingCredentials()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Credential review queue
        </h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Platform-admin only. {pending.length} pending.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border-base)] bg-white p-12 text-center">
          <p className="text-sm text-[var(--color-slate-soft)]">Nothing in the queue.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((row) => (
            <CredentialReviewRow
              key={row.credential.id}
              credential={row.credential}
              creatorName={row.user.fullName ?? row.user.email}
              creatorEmail={row.user.email}
            />
          ))}
        </div>
      )}
    </div>
  )
}
