import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { packVersions, packEntries, packs } from '@hyperspeed/db/schema'
import { db } from '@/lib/db'
import { hasRoleAtLeast, requireOrgContext } from '@/lib/auth/session'
import { VersionLifecycleControls } from './lifecycle-controls'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ packId: string; versionId: string }>
}

export default async function VersionDetailPage({ params }: PageProps) {
  const { packId, versionId } = await params
  const ctx = await requireOrgContext()

  const [join] = await db()
    .select({ version: packVersions, pack: packs })
    .from(packVersions)
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(
      and(
        eq(packVersions.id, versionId),
        eq(packVersions.packId, packId),
        eq(packs.organizationId, ctx.organization.id),
      ),
    )
  if (!join) notFound()

  const entries = await db()
    .select()
    .from(packEntries)
    .where(eq(packEntries.packVersionId, versionId))
    .orderBy(packEntries.orderIndex)

  const canEdit = await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/dashboard/packs/${packId}`}
          className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-deep)]"
        >
          ← {join.pack.name}
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              v{join.version.versionNumber}
              <span
                className={`ml-3 rounded-full px-2 py-0.5 align-middle text-xs ${
                  join.version.status === 'published'
                    ? 'bg-green-50 text-green-700'
                    : join.version.status === 'in_review'
                      ? 'bg-amber-50 text-amber-700'
                      : join.version.status === 'archived'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-[var(--color-primary-pale)] text-[var(--color-primary-deep)]'
                }`}
              >
                {join.version.status}
              </span>
            </h1>
            <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} ·
              {join.version.publishedAt
                ? ` published ${new Date(join.version.publishedAt).toLocaleDateString()}`
                : ' not yet published'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (join.version.status === 'draft' || join.version.status === 'in_review') ? (
              <>
                <Link
                  href={`/dashboard/packs/${packId}/versions/${versionId}/edit`}
                  className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 text-sm text-[var(--color-ink)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]"
                >
                  Edit entries
                </Link>
                <Link
                  href={`/dashboard/packs/${packId}/versions/${versionId}/ingest`}
                  className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 text-sm text-[var(--color-ink)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]"
                >
                  AI ingest
                </Link>
              </>
            ) : null}
            <Link
              href={`/dashboard/packs/${packId}/versions/${versionId}/test`}
              className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 text-sm text-[var(--color-ink)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]"
            >
              Test chat
            </Link>
            <Link
              href={`/dashboard/packs/${packId}/versions/${versionId}/evals`}
              className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 text-sm text-[var(--color-ink)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]"
            >
              Evals
            </Link>
            {canEdit ? (
              <VersionLifecycleControls
                versionId={versionId}
                status={join.version.status}
                entryCount={entries.length}
              />
            ) : null}
          </div>
        </div>
        {join.version.changelog ? (
          <p className="mt-3 whitespace-pre-wrap rounded-lg border border-[var(--color-border-base)] bg-white p-3 text-sm text-[var(--color-ink)]">
            {join.version.changelog}
          </p>
        ) : null}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
          Entries
        </h2>
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border-base)] bg-white p-10 text-center">
            <p className="text-sm text-[var(--color-slate-soft)]">
              No entries yet — the pack editor lands in Phase 3.1.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <div
                key={e.id}
                className="rounded-lg border border-[var(--color-border-base)] bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-[var(--color-primary-pale)] px-2 py-0.5 text-[var(--color-primary-deep)]">
                    {e.entryType.replace(/_/g, ' ')}
                  </span>
                  {e.tags?.length ? (
                    <span className="text-[var(--color-slate-soft)]">{e.tags.join(' · ')}</span>
                  ) : null}
                </div>
                <h3 className="mt-2 font-semibold text-[var(--color-ink)]">{e.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-slate-soft)]">
                  {e.content.length > 360 ? e.content.slice(0, 360) + '…' : e.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
