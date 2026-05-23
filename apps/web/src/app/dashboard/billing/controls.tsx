'use client'

import { useState } from 'react'

export function BillingControls({
  hasSubscription,
  canQuery,
}: {
  hasSubscription: boolean
  canQuery: boolean
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go(path: string) {
    setError(null)
    setPending(true)
    try {
      const res = await fetch(path, { method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? `HTTP ${res.status}`)
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {hasSubscription ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => go('/api/billing/portal')}
          className="rounded-md border border-[var(--color-border-base)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] shadow-sm transition hover:bg-[var(--color-primary-pale)] disabled:opacity-60"
        >
          {pending ? 'Opening…' : 'Manage subscription'}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => go('/api/billing/checkout')}
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
        >
          {pending ? 'Loading…' : canQuery ? 'Restart subscription' : 'Subscribe'}
        </button>
      )}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  )
}
