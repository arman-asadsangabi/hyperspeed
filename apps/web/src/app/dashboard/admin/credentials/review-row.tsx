'use client'

import { useTransition, useState } from 'react'
import type { Credential } from '@hyperspeed/db/schema'
import { adminVerifyCredential, adminRejectCredential } from '@/lib/creators/actions'

interface Props {
  credential: Credential
  creatorName: string
  creatorEmail: string
}

export function CredentialReviewRow({ credential: c, creatorName, creatorEmail }: Props) {
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState('')

  return (
    <div className="rounded-lg border border-[var(--color-border-base)] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-[var(--color-ink)]">{c.title}</span>
            <span className="rounded-full bg-[var(--color-primary-pale)] px-2 py-0.5 text-xs text-[var(--color-primary-deep)]">
              {c.credentialType.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="mt-1 text-sm text-[var(--color-slate-soft)]">
            {c.issuingOrganization}
            {c.licenseNumber ? ` · #${c.licenseNumber}` : ''}
          </div>
          <div className="mt-1 text-xs text-[var(--color-slate-soft)]">
            Submitted by {creatorName} ({creatorEmail})
          </div>
          {c.supportingDocumentUrl ? (
            <a
              href={c.supportingDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-deep)]"
            >
              View supporting document →
            </a>
          ) : null}
        </div>
        <div className="text-right text-xs text-[var(--color-slate-soft)]">
          Submitted {new Date(c.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-[var(--color-slate-soft)]">
          Reviewer notes (required for rejection)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="shadow-xs mt-1 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          placeholder="Optional for approval; required for rejection"
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void adminVerifyCredential(c.id, note || undefined)
            })
          }
          className="rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
        >
          Verify
        </button>
        <button
          type="button"
          disabled={pending || !note}
          onClick={() =>
            startTransition(() => {
              void adminRejectCredential(c.id, note)
            })
          }
          className="rounded-md border border-[var(--color-border-base)] bg-white px-4 py-1.5 text-sm text-[var(--color-ink)] hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
