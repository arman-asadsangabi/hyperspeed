'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { DesignPartnerApplication } from '@hyperspeed/db/schema'
import { updateApplicationStatus } from '@/lib/design_partners/actions'

const STATUSES: DesignPartnerApplication['status'][] = [
  'new',
  'in_discussion',
  'qualified',
  'closed_won',
  'closed_lost',
]

const COLORS: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  in_discussion: 'bg-amber-50 text-amber-700',
  qualified: 'bg-purple-50 text-purple-700',
  closed_won: 'bg-green-50 text-green-700',
  closed_lost: 'bg-slate-100 text-slate-700',
}

export function ApplicationRow({ application: a }: { application: DesignPartnerApplication }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [notes, setNotes] = useState(a.notes ?? '')

  return (
    <article className="rounded-lg border border-[var(--color-border-base)] bg-white p-5 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-ink)]">{a.companyName}</h3>
          <p className="text-sm text-[var(--color-slate-soft)]">
            {a.contactName ?? a.contactEmail} · {a.contactEmail}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs ${COLORS[a.status]}`}>{a.status}</span>
      </header>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <dt className="text-[var(--color-slate-soft)]">Domain</dt>
        <dd className="text-[var(--color-ink)]">{a.targetDomain ?? '—'}</dd>
        <dt className="text-[var(--color-slate-soft)]">Budget</dt>
        <dd className="text-[var(--color-ink)]">{a.budgetRange ?? '—'}</dd>
        <dt className="text-[var(--color-slate-soft)]">Timeline</dt>
        <dd className="text-[var(--color-ink)]">{a.timeline ?? '—'}</dd>
        <dt className="text-[var(--color-slate-soft)]">Source</dt>
        <dd className="text-[var(--color-ink)]">{a.referralSource ?? '—'}</dd>
      </dl>
      {a.useCase ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-ink)]">{a.useCase}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending || s === a.status}
            onClick={() =>
              startTransition(async () => {
                await updateApplicationStatus(a.id, s, notes || undefined)
                router.refresh()
              })
            }
            className={`rounded-md px-2.5 py-1 text-xs transition disabled:opacity-50 ${
              s === a.status
                ? 'bg-[var(--color-ink)] text-white'
                : 'border border-[var(--color-border-base)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-primary-pale)]'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-[var(--color-slate-soft)]">Notes</summary>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)]"
        />
      </details>
    </article>
  )
}
