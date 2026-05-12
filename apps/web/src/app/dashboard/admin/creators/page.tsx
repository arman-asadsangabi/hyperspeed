import { redirect } from 'next/navigation'
import { requireSessionUser } from '@/lib/auth/session'
import { isPlatformAdmin } from '@/lib/creators/actions'
import { listInvitations } from '@/lib/creator_pipeline/actions'
import { InviteForm } from './invite-form'

export const dynamic = 'force-dynamic'

export default async function AdminCreatorsPage() {
  const u = await requireSessionUser()
  if (!(await isPlatformAdmin(u.id))) redirect('/dashboard')
  const invites = await listInvitations()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Creator invitations
        </h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Generate invite codes for verified domain experts.
        </p>
      </div>

      <section className="rounded-xl border border-[var(--color-border-base)] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-[var(--color-ink)]">New invite</h2>
        <div className="mt-4">
          <InviteForm />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Code
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Email
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Domain
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Status
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Expires
              </th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-slate-soft)]">
                  No invitations yet.
                </td>
              </tr>
            ) : (
              invites.map((i) => (
                <tr key={i.id} className="border-t border-[var(--color-border-base)]">
                  <td className="px-4 py-2 font-mono text-xs text-[var(--color-ink)]">
                    {i.inviteCode}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-ink)]">{i.email ?? '—'}</td>
                  <td className="px-4 py-2 text-[var(--color-slate-soft)]">
                    {i.targetDomain ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-slate-soft)]">
                    {i.acceptedAt ? 'accepted' : i.expiresAt < new Date() ? 'expired' : 'pending'}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-slate-soft)]">
                    {new Date(i.expiresAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
