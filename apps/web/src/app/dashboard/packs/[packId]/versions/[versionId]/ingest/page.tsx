import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { packs, packVersions } from '@hyperspeed/db/schema'
import { isAnthropicConfigured } from '@hyperspeed/eval'
import { db } from '@/lib/db'
import { requireOrgContext, hasRoleAtLeast } from '@/lib/auth/session'
import { listProposalsForUI } from '@/lib/packs/ingestion'
import { listDocumentsForPack } from '@/lib/documents/actions'
import { IngestionRunner } from './runner'
import { ProposalCard } from './proposal-card'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ packId: string; versionId: string }>
}

export default async function IngestPage({ params }: PageProps) {
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
  const canEdit = await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')

  const [proposals, docs] = await Promise.all([
    listProposalsForUI(versionId),
    listDocumentsForPack(packId),
  ])
  const completedDocs = docs.filter(
    (d) => d.textExtractionStatus === 'completed' && d.extractedText,
  )
  const aiOk = isAnthropicConfigured()

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/dashboard/packs/${packId}/versions/${versionId}`}
          className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-deep)]"
        >
          ← v{join.version.versionNumber}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          AI-assisted ingestion
        </h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Pick documents → Claude extracts candidate entries → you accept, edit, or reject.
        </p>
      </div>

      {!aiOk ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ANTHROPIC_API_KEY is not set on the server. Ingestion will return an error until it&apos;s
          configured.
        </div>
      ) : null}

      {canEdit && completedDocs.length > 0 ? (
        <IngestionRunner
          versionId={versionId}
          documents={completedDocs.map((d) => ({ id: d.id, filename: d.filename }))}
        />
      ) : (
        <div className="rounded-md border border-[var(--color-border-base)] bg-white p-6 text-sm text-[var(--color-slate-soft)]">
          {completedDocs.length === 0 ? (
            <>
              No processed documents yet.{' '}
              <Link
                href={`/dashboard/packs/${packId}/documents`}
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-deep)]"
              >
                Upload documents
              </Link>{' '}
              and wait for text extraction to finish.
            </>
          ) : (
            <>Read-only — only admins can run ingestion.</>
          )}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
          Proposals {proposals.length > 0 ? `· ${proposals.length}` : ''}
        </h2>
        {proposals.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border-base)] bg-white p-6 text-center text-sm text-[var(--color-slate-soft)]">
            No proposals yet. Run an ingestion above.
          </p>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} canEdit={canEdit} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
