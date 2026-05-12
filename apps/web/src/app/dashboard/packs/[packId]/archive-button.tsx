'use client'

import { useTransition } from 'react'
import { archivePack } from '@/lib/packs/actions'

export function ArchiveButton({ packId }: { packId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={() => {
        if (
          !confirm('Archive this pack? Members will lose write access. You can restore it later.')
        )
          return
        startTransition(() => {
          void archivePack(packId)
        })
      }}
      disabled={pending}
      className="rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 text-sm text-[var(--color-ink)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Archiving…' : 'Archive'}
    </button>
  )
}
