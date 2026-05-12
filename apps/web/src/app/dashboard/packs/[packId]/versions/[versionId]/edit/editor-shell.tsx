'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PackEntry } from '@hyperspeed/db/schema'
import { ENTRY_TYPES } from '@hyperspeed/shared/constants'
import { createEntry, updateEntry, deleteEntry, moveEntry } from '@/lib/packs/entries'

const ENTRY_TYPE_LABEL: Record<string, string> = {
  fact: 'Fact',
  heuristic: 'Heuristic',
  decision_rule: 'Decision rule',
  example: 'Example',
  citation: 'Citation',
  meta_rule: 'Meta rule',
}

const TYPE_COLORS: Record<string, string> = {
  fact: 'bg-blue-50 text-blue-700',
  heuristic: 'bg-purple-50 text-purple-700',
  decision_rule: 'bg-amber-50 text-amber-700',
  example: 'bg-green-50 text-green-700',
  citation: 'bg-slate-100 text-slate-700',
  meta_rule: 'bg-pink-50 text-pink-700',
}

export function EditorShell({
  versionId,
  initialEntries,
}: {
  versionId: string
  initialEntries: PackEntry[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(initialEntries[0]?.id ?? null)
  const [creating, setCreating] = useState(initialEntries.length === 0)
  const [error, setError] = useState<string | null>(null)
  const active = initialEntries.find((e) => e.id === activeId) ?? null

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-1 rounded-lg border border-[var(--color-border-base)] bg-white p-3">
        <button
          type="button"
          onClick={() => {
            setCreating(true)
            setActiveId(null)
          }}
          className="mb-2 w-full rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-primary-deep)]"
        >
          + New entry
        </button>
        {initialEntries.length === 0 ? (
          <p className="px-2 py-1 text-xs text-[var(--color-slate-soft)]">No entries yet.</p>
        ) : null}
        {initialEntries.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => {
              setActiveId(e.id)
              setCreating(false)
            }}
            className={`w-full rounded-md px-2.5 py-2 text-left text-sm transition ${
              activeId === e.id
                ? 'bg-[var(--color-primary-pale)] text-[var(--color-ink)]'
                : 'text-[var(--color-slate-soft)] hover:bg-[var(--color-primary-pale)] hover:text-[var(--color-ink)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${TYPE_COLORS[e.entryType]}`}
              >
                {ENTRY_TYPE_LABEL[e.entryType]}
              </span>
            </div>
            <div className="mt-0.5 line-clamp-2">{e.title}</div>
          </button>
        ))}
      </aside>

      <section className="rounded-lg border border-[var(--color-border-base)] bg-white p-6">
        {error ? (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {creating || !active ? (
          <EntryForm
            key="new"
            onSubmit={(fd) => {
              startTransition(async () => {
                setError(null)
                const result = await createEntry(versionId, fd)
                if ('error' in result) setError(result.error)
                else {
                  router.refresh()
                  setCreating(false)
                  setActiveId(result.id)
                }
              })
            }}
            submitLabel="Add entry"
            disabled={pending}
          />
        ) : (
          <EntryForm
            key={active.id}
            entry={active}
            onSubmit={(fd) => {
              startTransition(async () => {
                setError(null)
                const result = await updateEntry(active.id, fd)
                if ('error' in result) setError(result.error)
                else router.refresh()
              })
            }}
            submitLabel="Save entry"
            disabled={pending}
            onDelete={() => {
              if (!confirm('Delete this entry?')) return
              startTransition(async () => {
                await deleteEntry(active.id)
                setActiveId(initialEntries.find((e) => e.id !== active.id)?.id ?? null)
                router.refresh()
              })
            }}
            onMoveUp={() => {
              startTransition(async () => {
                await moveEntry(active.id, 'up')
                router.refresh()
              })
            }}
            onMoveDown={() => {
              startTransition(async () => {
                await moveEntry(active.id, 'down')
                router.refresh()
              })
            }}
          />
        )}
      </section>
    </div>
  )
}

function EntryForm({
  entry,
  onSubmit,
  submitLabel,
  disabled,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  entry?: PackEntry
  onSubmit: (fd: FormData) => void
  submitLabel: string
  disabled: boolean
  onDelete?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(new FormData(e.currentTarget))
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink)]">Type</label>
          <select
            name="entryType"
            required
            defaultValue={entry?.entryType ?? 'fact'}
            className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          >
            {ENTRY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTRY_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink)]">Title</label>
          <input
            name="title"
            type="text"
            required
            maxLength={280}
            defaultValue={entry?.title ?? ''}
            className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)]">
          Content{' '}
          <span className="text-xs text-[var(--color-slate-soft)]">(markdown supported)</span>
        </label>
        <textarea
          name="content"
          rows={14}
          required
          defaultValue={entry?.content ?? ''}
          className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 font-mono text-xs text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink)]">
            Tags <span className="text-xs text-[var(--color-slate-soft)]">(comma-separated)</span>
          </label>
          <input
            name="tags"
            type="text"
            defaultValue={(entry?.tags ?? []).join(', ')}
            className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink)]">
            Structured data{' '}
            <span className="text-xs text-[var(--color-slate-soft)]">(JSON, optional)</span>
          </label>
          <input
            name="structuredData"
            type="text"
            placeholder='{"confidence":"high"}'
            defaultValue={entry?.structuredData ? JSON.stringify(entry.structuredData) : ''}
            className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 font-mono text-xs text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={disabled}
          className="rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
        >
          {disabled ? 'Saving…' : submitLabel}
        </button>
        {onMoveUp ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onMoveUp}
            className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-primary-pale)] disabled:opacity-60"
          >
            ↑ Move up
          </button>
        ) : null}
        {onMoveDown ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onMoveDown}
            className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-primary-pale)] disabled:opacity-60"
          >
            ↓ Move down
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onDelete}
            className="ml-auto rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 text-sm text-[var(--color-ink)] hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  )
}
