import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { packs, packVersions, categories } from '@hyperspeed/db/schema'
import { isAnthropicConfigured, PUBLISH_GATE_CONFIG } from '@hyperspeed/eval'
import { db } from '@/lib/db'
import { hasRoleAtLeast, requireOrgContext } from '@/lib/auth/session'
import { listEvalRuns, listTestSetsForCategory, checkEvalGate } from '@/lib/packs/evals'
import { EvalRunner } from './runner'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ packId: string; versionId: string }>
}

export default async function EvalsPage({ params }: PageProps) {
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
  const canRun = await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')

  const [cat] = join.pack.categoryId
    ? await db().select().from(categories).where(eq(categories.id, join.pack.categoryId))
    : []

  const [runs, sets, gate] = await Promise.all([
    listEvalRuns(versionId),
    listTestSetsForCategory(join.pack.categoryId),
    checkEvalGate(versionId),
  ])

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
          Evaluation
        </h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Run benchmarks against canonical test sets. Publishing requires overall ≥{' '}
          {PUBLISH_GATE_CONFIG.overall}, accuracy ≥ {PUBLISH_GATE_CONFIG.accuracy}, citation
          coverage ≥ {PUBLISH_GATE_CONFIG.citation_coverage}, hallucination ≤{' '}
          {PUBLISH_GATE_CONFIG.hallucination_rate}, quality ≥ {PUBLISH_GATE_CONFIG.response_quality}
          .
        </p>
      </div>

      {!isAnthropicConfigured() ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ANTHROPIC_API_KEY is not set on the server. Eval runs will fail until it&apos;s
          configured.
        </div>
      ) : null}

      <section
        className={`rounded-xl border p-6 shadow-sm ${
          gate.passed
            ? 'border-green-200 bg-green-50'
            : 'border-[var(--color-border-base)] bg-white'
        }`}
      >
        <h2 className="text-sm font-medium text-[var(--color-ink)]">Publish gate status</h2>
        <p className="mt-1 text-sm">
          {gate.passed ? (
            <span className="text-green-700">Passed — version is eligible to publish.</span>
          ) : (
            <span className="text-[var(--color-slate-soft)]">
              Blocked: {gate.reason ?? 'no eval yet'}
            </span>
          )}
        </p>
        {gate.dimensions ? (
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
            {Object.entries(gate.dimensions).map(([k, v]) => (
              <div key={k} className="rounded-md bg-white p-2">
                <div className="uppercase tracking-wider text-[var(--color-slate-soft)]">
                  {k.replace(/_/g, ' ')}
                </div>
                <div className="text-base font-semibold text-[var(--color-ink)]">
                  {Number(v).toFixed(1)}
                </div>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      {canRun ? (
        <EvalRunner
          versionId={versionId}
          testSets={sets.map((s) => ({ id: s.id, name: s.name }))}
          domain={cat?.name ?? null}
        />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
          Past runs
        </h2>
        {runs.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border-base)] bg-white p-6 text-center text-sm text-[var(--color-slate-soft)]">
            No runs yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    When
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Overall
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Model
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--color-border-base)]">
                    <td className="px-4 py-2 text-[var(--color-slate-soft)]">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-[var(--color-ink)]">{r.status}</td>
                    <td className="px-4 py-2 font-mono text-[var(--color-ink)]">
                      {r.overallScore ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-[var(--color-slate-soft)]">{r.modelName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
