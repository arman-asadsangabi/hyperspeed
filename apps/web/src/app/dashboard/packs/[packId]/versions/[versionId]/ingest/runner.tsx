'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { runIngestion } from '@/lib/packs/ingestion'

interface Props {
  versionId: string
  documents: { id: string; filename: string }[]
}

export function IngestionRunner({ versionId, documents }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  return (
    <section className="rounded-xl border border-[var(--color-border-base)] bg-white p-6 shadow-sm">
      <h2 className="text-sm font-medium text-[var(--color-ink)]">Pick documents to ingest</h2>
      <p className="mt-1 text-xs text-[var(--color-slate-soft)]">
        Each document is sent to Claude with prompt caching. Costs a few cents per document.
      </p>
      <div className="mt-4 space-y-1">
        {documents.map((d) => (
          <label
            key={d.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-primary-pale)]"
          >
            <input
              type="checkbox"
              checked={selected.has(d.id)}
              onChange={() => toggle(d.id)}
              className="accent-[var(--color-primary)]"
            />
            <span className="truncate">{d.filename}</span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={pending || selected.size === 0}
          onClick={() =>
            startTransition(async () => {
              setStatus(
                `Running Claude on ${selected.size} document${selected.size === 1 ? '' : 's'}...`,
              )
              const result = await runIngestion(versionId, [...selected])
              if ('error' in result && result.error) setStatus(`Error: ${result.error}`)
              else
                setStatus(`Created ${result.created} proposal${result.created === 1 ? '' : 's'}.`)
              router.refresh()
            })
          }
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
        >
          {pending ? 'Running…' : 'Run ingestion'}
        </button>
        {status ? <span className="text-xs text-[var(--color-slate-soft)]">{status}</span> : null}
      </div>
    </section>
  )
}
