import { redirect } from 'next/navigation'
import Link from 'next/link'
import { hasRoleAtLeast, requireOrgContext } from '@/lib/auth/session'
import { listCategories } from '@/lib/packs/actions'
import { NewPackForm } from './new-pack-form'

export const dynamic = 'force-dynamic'

export default async function NewPackPage() {
  const ctx = await requireOrgContext()
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin'))) {
    redirect('/dashboard/packs')
  }
  const cats = await listCategories()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/packs"
          className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-deep)]"
        >
          ← Packs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          New pack
        </h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Creates the pack with an empty draft version (0.1.0). You&apos;ll add entries in the next
          phase.
        </p>
      </div>
      <div className="rounded-xl border border-[var(--color-border-base)] bg-white p-8 shadow-sm">
        <NewPackForm categories={cats} />
      </div>
    </div>
  )
}
