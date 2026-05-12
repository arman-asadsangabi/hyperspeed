'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startEvalRun } from '@/lib/packs/evals'

interface Props {
  versionId: string
  testSets: { id: string; name: string }[]
  domain: string | null
}

export function EvalRunner({ versionId, testSets, domain }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [chosen, setChosen] = useState(testSets[0]?.id ?? '')
  const [status, setStatus] = useState<string | null>(null)

  if (testSets.length === 0)
    return (
      <div className="rounded-md border border-[var(--color-border-base)] bg-white p-6 text-sm text-[var(--color-slate-soft)]">
        No test sets for the {domain ?? 'this'} category yet. Add one via the admin console or seed
        migration.
      </div>
    )

  return (
    <section className="rounded-xl border border-[var(--color-border-base)] bg-white p-6 shadow-sm">
      <h2 className="text-sm font-medium text-[var(--color-ink)]">Run evaluation</h2>
      <p className="mt-1 text-xs text-[var(--color-slate-soft)]">
        Each test case runs through your pack via Claude, then through the judge. Typically ~30
        seconds + a few cents per case.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
          className="shadow-xs rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
        >
          {testSets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !chosen}
          onClick={() =>
            startTransition(async () => {
              setStatus('Running…')
              const result = await startEvalRun(versionId, chosen)
              if ('error' in result && result.error) setStatus(`Error: ${result.error}`)
              else setStatus('Complete.')
              router.refresh()
            })
          }
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
        >
          {pending ? 'Running…' : 'Run eval'}
        </button>
        {status ? <span className="text-xs text-[var(--color-slate-soft)]">{status}</span> : null}
      </div>
    </section>
  )
}
