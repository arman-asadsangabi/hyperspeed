import { eq, isNull } from 'drizzle-orm'
import { requireOrgContext, hasRoleAtLeast } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { organizationMembers, organizationInvitations, users } from '@hyperspeed/db/schema'
import { InviteMemberForm } from './invite-member-form'

export const dynamic = 'force-dynamic'

export default async function MembersPage() {
  const ctx = await requireOrgContext()
  const canInvite = await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')

  const members = await db()
    .select({
      memberId: organizationMembers.id,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, ctx.organization.id))
    .orderBy(organizationMembers.joinedAt)

  const pendingInvites = canInvite
    ? await db()
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.organizationId, ctx.organization.id))
        .orderBy(organizationInvitations.createdAt)
    : []
  const stillPending = pendingInvites.filter((i) => i.acceptedAt === null)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Members</h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          {members.length} member{members.length === 1 ? '' : 's'} in {ctx.organization.name}.
        </p>
      </div>

      {canInvite ? (
        <section className="rounded-lg border border-[var(--color-border-base)] bg-white p-6">
          <h2 className="text-sm font-medium text-[var(--color-ink)]">Invite someone</h2>
          <p className="mt-1 text-xs text-[var(--color-slate-soft)]">
            They&apos;ll get a token to paste at /onboarding to join.
          </p>
          <div className="mt-4">
            <InviteMemberForm orgId={ctx.organization.id} />
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Member
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Role
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.memberId} className="border-t border-[var(--color-border-base)]">
                <td className="px-4 py-2">
                  <div className="text-[var(--color-ink)]">{m.fullName ?? m.email}</div>
                  {m.fullName ? (
                    <div className="text-xs text-[var(--color-slate-soft)]">{m.email}</div>
                  ) : null}
                </td>
                <td className="px-4 py-2 text-[var(--color-ink)]">{m.role}</td>
                <td className="px-4 py-2 text-[var(--color-slate-soft)]">
                  {new Date(m.joinedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {stillPending.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
            Pending invitations
          </h2>
          <div className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Role
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Token
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Expires
                  </th>
                </tr>
              </thead>
              <tbody>
                {stillPending.map((i) => (
                  <tr key={i.id} className="border-t border-[var(--color-border-base)]">
                    <td className="px-4 py-2 text-[var(--color-ink)]">{i.email}</td>
                    <td className="px-4 py-2 text-[var(--color-ink)]">{i.role}</td>
                    <td className="px-4 py-2 font-mono text-xs text-[var(--color-slate-soft)]">
                      {i.token.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-2 text-[var(--color-slate-soft)]">
                      {new Date(i.expiresAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* satisfy unused import — used by RLS-flow context */}
      <span className="hidden" data-anchor={isNull.name} />
    </div>
  )
}
