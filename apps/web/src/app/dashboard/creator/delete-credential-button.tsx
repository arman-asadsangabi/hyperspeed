'use client'

import { useTransition } from 'react'
import { deletePendingCredential } from '@/lib/creators/actions'

export function DeleteCredentialButton({ credentialId }: { credentialId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm('Remove this pending credential?')) return
        startTransition(() => {
          void deletePendingCredential(credentialId)
        })
      }}
      disabled={pending}
      className="text-xs text-[var(--color-slate-soft)] underline-offset-2 hover:text-red-600 hover:underline"
    >
      {pending ? '…' : 'Remove'}
    </button>
  )
}
