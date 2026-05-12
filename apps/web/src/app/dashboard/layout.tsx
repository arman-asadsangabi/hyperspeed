import Link from 'next/link'
import { requireOrgContext, getMyMemberships } from '@/lib/auth/session'
import { OrgSwitcher } from '@/components/dashboard/org-switcher'
import { UserMenu } from '@/components/dashboard/user-menu'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/packs', label: 'Packs' },
  { href: '/dashboard/creator', label: 'Creator' },
  { href: '/dashboard/api', label: 'API' },
  { href: '/dashboard/members', label: 'Members' },
  { href: '/dashboard/admin/audit', label: 'Audit log', minRole: 'admin' as const },
  { href: '/dashboard/settings', label: 'Settings' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrgContext()
  const memberships = await getMyMemberships(ctx.user.id)

  const visibleNav = NAV.filter((item) => {
    if (!item.minRole) return true
    const rank = { member: 1, admin: 2, owner: 3 } as const
    return rank[ctx.role] >= rank[item.minRole]
  })

  return (
    <div className="min-h-screen bg-[var(--color-primary-pale)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border-base)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="size-6 rounded-md bg-[var(--color-primary)]" aria-hidden />
              <span className="font-semibold tracking-tight text-[var(--color-ink)]">
                Hyperspeed
              </span>
            </Link>
            <span className="text-[var(--color-border-base)]">/</span>
            <OrgSwitcher activeOrgId={ctx.organization.id} memberships={memberships} />
          </div>
          <UserMenu user={ctx.user} />
        </div>
        <nav className="border-t border-[var(--color-border-base)]">
          <div className="mx-auto flex max-w-6xl gap-1 px-4">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-t-md px-3 py-2.5 text-sm text-[var(--color-slate-soft)] transition hover:bg-[var(--color-primary-pale)] hover:text-[var(--color-ink)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
