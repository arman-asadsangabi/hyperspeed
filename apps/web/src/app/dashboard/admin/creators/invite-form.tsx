'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCreatorInvitation } from '@/lib/creator_pipeline/actions'

export function InviteForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [domain, setDomain] = useState('')
  const [pending, startTransition] = useTransition()
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="email"
          placeholder="creator@example.com (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
        />
        <input
          type="text"
          placeholder="tax / legal / medical"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
        />
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null)
            const r = await createCreatorInvitation(email || undefined, domain || undefined)
            if ('error' in r) setError(r.error)
            else {
              setCode(r.inviteCode)
              setEmail('')
              setDomain('')
              router.refresh()
            }
          })
        }
        className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
      >
        {pending ? 'Generating…' : 'Generate invite code'}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {code ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
          <p className="text-green-800">
            Share this code with the creator. They redeem it at <code>/creators/invite/{code}</code>
            .
          </p>
          <code className="mt-2 block break-all rounded bg-white p-2 font-mono text-xs text-[var(--color-ink)]">
            {code}
          </code>
        </div>
      ) : null}
    </div>
  )
}
