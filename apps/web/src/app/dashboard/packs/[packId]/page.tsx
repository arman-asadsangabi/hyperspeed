import Link from 'next/link'
import { notFound } from 'next/navigation'
import { hasRoleAtLeast, requireOrgContext } from '@/lib/auth/session'
import { getPack } from '@/lib/packs/actions'
import { ArchiveButton } from './archive-button'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ packId: string }>
}

export default async function PackDetailPage({ params }: PageProps) {
  const { packId } = await params
  const ctx = await requireOrgContext()
  const result = await getPack(packId)
  if (!result) notFound()

  const { pack, category, versions } = result
  const canEdit = await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')
  const latestDraft = versions.find((v) => v.status === 'draft')
  const latestPublished = versions.find((v) => v.status === 'published')

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/packs"
          className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-deep)]"
        >
          ← Packs
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              {pack.name}
              {pack.isArchived ? (
                <span className="ml-3 rounded-full bg-[var(--color-primary-pale)] px-2 py-0.5 align-middle text-xs text-[var(--color-slate-soft)]">
                  archived
                </span>
              ) : null}
            </h1>
            <p className="mt-1 font-mono text-xs text-[var(--color-slate-soft)]">/{pack.slug}</p>
          </div>
          {canEdit && !pack.isArchived ? <ArchiveButton packId={pack.id} /> : null}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card label="Category">{category?.name ?? 'Uncategorized'}</Card>
        <Card label="Target use case">{pack.targetUseCase ?? '—'}</Card>
        <Card label="Updated">{new Date(pack.updatedAt).toLocaleString()}</Card>
      </section>

      {pack.description ? (
        <section>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
            Description
          </h2>
          <p className="whitespace-pre-wrap rounded-lg border border-[var(--color-border-base)] bg-white p-4 text-sm text-[var(--color-ink)]">
            {pack.description}
          </p>
        </section>
      ) : null}

      <section>
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
            Versions
          </h2>
          <span className="text-xs text-[var(--color-slate-soft)]">
            {versions.length} total
            {latestPublished ? ` · latest published: ${latestPublished.versionNumber}` : ''}
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                  Version
                </th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                  Status
                </th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                  Created
                </th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                  Published
                </th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-t border-[var(--color-border-base)]">
                  <td className="px-4 py-2 font-mono text-[var(--color-ink)]">{v.versionNumber}</td>
                  <td className="px-4 py-2 text-[var(--color-ink)]">{v.status}</td>
                  <td className="px-4 py-2 text-[var(--color-slate-soft)]">
                    {new Date(v.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-slate-soft)]">
                    {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {latestDraft ? (
          <p className="mt-2 text-xs text-[var(--color-slate-soft)]">
            Draft <span className="font-mono">{latestDraft.versionNumber}</span> is open — the pack
            editor lands in Phase 3.1.
          </p>
        ) : null}
      </section>
    </div>
  )
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-base)] bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
        {label}
      </div>
      <div className="mt-1 text-sm text-[var(--color-ink)]">{children}</div>
    </div>
  )
}
