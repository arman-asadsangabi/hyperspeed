'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ProposalForUI } from '@/lib/packs/ingestion'
import { acceptProposal, rejectProposal } from '@/lib/packs/ingestion'

const STATUS_COLORS: Record<string, string> = {
  pending_review: 'bg-amber-50 text-amber-700',
  accepted: 'bg-green-50 text-green-700',
  edited: 'bg-blue-50 text-blue-700',
  rejected: 'bg-slate-100 text-slate-700',
}

const CONF_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-[var(--color-primary-pale)] text-[var(--color-primary-deep)]',
  high: 'bg-green-50 text-green-700',
}

export function ProposalCard({
  proposal: p,
  canEdit,
}: {
  proposal: ProposalForUI
  canEdit: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(p.title)
  const [content, setContent] = useState(p.content)
  const [tags, setTags] = useState(p.suggestedTags.join(', '))
  const [error, setError] = useState<string | null>(null)

  const isPending = p.status === 'pending_review'

  return (
    <div className="rounded-lg border border-[var(--color-border-base)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full bg-[var(--color-primary-pale)] px-2 py-0.5 text-[var(--color-primary-deep)]">
          {p.entryType.replace(/_/g, ' ')}
        </span>
        <span className={`rounded-full px-2 py-0.5 ${CONF_COLORS[p.confidence]}`}>
          {p.confidence}
        </span>
        <span className={`rounded-full px-2 py-0.5 ${STATUS_COLORS[p.status] ?? ''}`}>
          {p.status}
        </span>
        {p.documentName ? (
          <span className="ml-auto text-[var(--color-slate-soft)]">from {p.documentName}</span>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full rounded-md border border-[var(--color-border-base)] px-3 py-2 text-sm"
          />
          <textarea
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="block w-full rounded-md border border-[var(--color-border-base)] px-3 py-2 font-mono text-xs"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tag1, tag2"
            className="block w-full rounded-md border border-[var(--color-border-base)] px-3 py-2 text-xs"
          />
        </div>
      ) : (
        <>
          <h3 className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{p.title}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-ink)]">
            {p.content.length > 600 ? p.content.slice(0, 600) + '…' : p.content}
          </p>
          {p.suggestedTags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
              {p.suggestedTags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[var(--color-border-base)] px-1.5 py-0.5 text-[var(--color-slate-soft)]"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          {p.sourceExcerpt ? (
            <details className="mt-3 text-xs text-[var(--color-slate-soft)]">
              <summary className="cursor-pointer">Source excerpt</summary>
              <blockquote className="mt-1 border-l-2 border-[var(--color-border-base)] pl-3 italic">
                {p.sourceExcerpt}
              </blockquote>
            </details>
          ) : null}
        </>
      )}

      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}

      {canEdit && isPending ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null)
                const r = await acceptProposal(p.id)
                if ('error' in r) setError(r.error)
                else router.refresh()
              })
            }
            className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
          >
            Accept
          </button>
          {!editing ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setEditing(true)}
              className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 text-sm hover:bg-[var(--color-primary-pale)]"
            >
              Edit & accept
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null)
                  const r = await acceptProposal(p.id, {
                    title,
                    content,
                    tags: tags
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                  if ('error' in r) setError(r.error)
                  else {
                    setEditing(false)
                    router.refresh()
                  }
                })
              }
              className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
            >
              Save edits & accept
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const reason = prompt('Reason for rejection (optional)') ?? undefined
              startTransition(async () => {
                await rejectProposal(p.id, reason)
                router.refresh()
              })
            }}
            className="ml-auto rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 text-sm hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            Reject
          </button>
        </div>
      ) : null}
    </div>
  )
}
