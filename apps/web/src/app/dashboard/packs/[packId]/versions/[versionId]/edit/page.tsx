import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { packs, packVersions } from '@hyperspeed/db/schema'
import { db } from '@/lib/db'
import { hasRoleAtLeast, requireOrgContext } from '@/lib/auth/session'
import { listEntries } from '@/lib/packs/entries'
import { EditorShell } from './editor-shell'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ packId: string; versionId: string }>
}

export default async function EditPage({ params }: PageProps) {
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
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')))
    redirect(`/dashboard/packs/${packId}/versions/${versionId}`)
  if (join.version.status === 'published' || join.version.status === 'archived')
    redirect(`/dashboard/packs/${packId}/versions/${versionId}`)

  const entries = await listEntries(versionId)

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/packs/${packId}/versions/${versionId}`}
          className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-deep)]"
        >
          ← v{join.version.versionNumber}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Editing {join.pack.name}{' '}
          <span className="font-mono text-base text-[var(--color-slate-soft)]">
            v{join.version.versionNumber}
          </span>
        </h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} · changes save on submit
        </p>
      </div>

      <EditorShell versionId={versionId} initialEntries={entries} />
    </div>
  )
}
