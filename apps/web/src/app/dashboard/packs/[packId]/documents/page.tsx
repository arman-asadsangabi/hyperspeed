import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPack } from '@/lib/packs/actions'
import { listDocumentsForPack } from '@/lib/documents/actions'
import { hasRoleAtLeast, requireOrgContext } from '@/lib/auth/session'
import { DocumentUploader } from './uploader'
import { DocumentRow } from './document-row'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ packId: string }>
}

export default async function PackDocumentsPage({ params }: PageProps) {
  const { packId } = await params
  const ctx = await requireOrgContext()
  const pack = await getPack(packId)
  if (!pack) notFound()
  const docs = await listDocumentsForPack(packId)
  const canEdit = await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/dashboard/packs/${packId}`}
          className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-deep)]"
        >
          ← {pack.pack.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Source documents
        </h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Upload PDFs, DOCX, TXT, MD, or HTML files. Text is extracted automatically and used by the
          AI-assisted ingestion in Phase 3.2.
        </p>
      </div>

      {canEdit ? (
        <section className="rounded-xl border border-[var(--color-border-base)] bg-white p-6 shadow-sm">
          <DocumentUploader packId={packId} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
          {docs.length} document{docs.length === 1 ? '' : 's'}
        </h2>
        {docs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border-base)] bg-white p-10 text-center text-sm text-[var(--color-slate-soft)]">
            No documents yet.
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((d) => (
              <DocumentRow key={d.id} document={d} canDelete={canEdit} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
