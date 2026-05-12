'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createApiKey, revokeApiKey } from '@/lib/api_keys/actions'

interface KeyRow {
  id: string
  name: string
  tier: string
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
}

export function KeysManager({
  initialKeys,
  canManage,
}: {
  initialKeys: KeyRow[]
  canManage: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [tier, setTier] = useState<'free' | 'startup' | 'enterprise'>('free')
  const [pending, startTransition] = useTransition()
  const [revealed, setRevealed] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {canManage ? (
        <section className="rounded-xl border border-[var(--color-border-base)] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-[var(--color-ink)]">Create a key</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production / staging / etc."
              className="min-w-[200px] flex-1 rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
            />
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as 'free' | 'startup' | 'enterprise')}
              className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm"
            >
              <option value="free">Free</option>
              <option value="startup">Startup</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null)
                  const result = await createApiKey(name || 'Unnamed', tier)
                  if ('error' in result) setError(result.error)
                  else {
                    setRevealed(result.key)
                    setName('')
                    router.refresh()
                  }
                })
              }
              className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
            >
              {pending ? 'Generating…' : 'Generate key'}
            </button>
          </div>
          {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
          {revealed ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                Copy this now — it won&apos;t be shown again:
              </p>
              <code className="mt-2 block break-all rounded bg-white p-3 font-mono text-xs text-[var(--color-ink)]">
                {revealed}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(revealed).catch(() => undefined)
                }}
                className="mt-2 text-xs text-amber-900 underline"
              >
                Copy to clipboard
              </button>
              <button
                type="button"
                onClick={() => setRevealed(null)}
                className="ml-3 text-xs text-amber-900 underline"
              >
                I&apos;ve saved it — hide
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Name
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Tier
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Prefix
              </th>
              <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                Last used
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {initialKeys.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-slate-soft)]">
                  No keys yet.
                </td>
              </tr>
            ) : (
              initialKeys.map((k) => (
                <tr key={k.id} className="border-t border-[var(--color-border-base)]">
                  <td className="px-4 py-2 text-[var(--color-ink)]">{k.name}</td>
                  <td className="px-4 py-2 text-[var(--color-slate-soft)]">{k.tier}</td>
                  <td className="px-4 py-2 font-mono text-xs text-[var(--color-slate-soft)]">
                    {k.keyPrefix}…
                  </td>
                  <td className="px-4 py-2 text-[var(--color-slate-soft)]">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'never'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm('Revoke this key? It will stop working immediately.')) return
                          startTransition(async () => {
                            await revokeApiKey(k.id)
                            router.refresh()
                          })
                        }}
                        className="text-xs text-[var(--color-slate-soft)] underline-offset-2 hover:text-red-600 hover:underline"
                      >
                        Revoke
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
