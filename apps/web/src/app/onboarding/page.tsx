import { redirect } from 'next/navigation'
import { getMyMemberships, requireSessionUser, setActiveOrgCookie } from '@/lib/auth/session'
import { CreateOrgForm } from './create-org-form'
import { AcceptInviteForm } from './accept-invite-form'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ invite?: string }>
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionUser()
  const memberships = await getMyMemberships(sessionUser.id)

  if (memberships.length > 0) {
    const first = memberships[0]
    if (first) await setActiveOrgCookie(first.organization.id)
    redirect('/dashboard')
  }

  const { invite } = await searchParams

  return (
    <main className="flex min-h-screen flex-col bg-[var(--color-primary-pale)]">
      <header className="border-b border-[var(--color-border-base)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[var(--color-primary)]" aria-hidden />
            <span className="font-semibold tracking-tight text-[var(--color-ink)]">Hyperspeed</span>
          </div>
          <span className="text-sm text-[var(--color-slate-soft)]">{sessionUser.email}</span>
        </div>
      </header>
      <section className="flex flex-1 items-start justify-center px-6 py-12">
        <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--color-border-base)] bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Create a new org</h2>
            <p className="mt-1.5 text-sm text-[var(--color-slate-soft)]">
              Start fresh. You&apos;ll be the owner.
            </p>
            <div className="mt-6">
              <CreateOrgForm defaultBillingEmail={sessionUser.email} />
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border-base)] bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Join an existing org</h2>
            <p className="mt-1.5 text-sm text-[var(--color-slate-soft)]">
              Paste the invitation token you received by email.
            </p>
            <div className="mt-6">
              <AcceptInviteForm initialToken={invite} />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
