import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { packs, packVersions, packEntries } from '@hyperspeed/db/schema'
import { isAnthropicConfigured } from '@hyperspeed/eval'
import { db } from '@/lib/db'
import { requireOrgContext } from '@/lib/auth/session'
import { TestChat } from './test-chat'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ packId: string; versionId: string }>
}

export default async function TestPage({ params }: PageProps) {
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
    .select({ id: packEntries.id, entryType: packEntries.entryType, title: packEntries.title })
    .from(packEntries)
    .where(eq(packEntries.packVersionId, versionId))
    .orderBy(packEntries.orderIndex)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/packs/${packId}/versions/${versionId}`}
          className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-deep)]"
        >
          ← v{join.version.versionNumber}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Test this version
        </h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Chat with the pack to find gaps. Claude is restricted to the {entries.length} entr
          {entries.length === 1 ? 'y' : 'ies'} in this version.
        </p>
      </div>

      {!isAnthropicConfigured() ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          AI test chat requires ANTHROPIC_API_KEY on the server.
        </div>
      ) : null}

      <TestChat versionId={versionId} entries={entries} />
    </div>
  )
}
