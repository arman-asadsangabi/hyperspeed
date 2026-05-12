'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPackVersion } from '@/lib/packs/versions'

export function NewDraftButton({ packId }: { packId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <div className="flex items-center gap-1.5">
      {(['patch', 'minor', 'major'] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const v = await createPackVersion(packId, { changelogType: kind })
              router.push(`/dashboard/packs/${packId}/versions/${v.id}`)
            })
          }
          className="rounded-md border border-[var(--color-border-base)] bg-white px-2 py-1 text-xs text-[var(--color-ink)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-pale)] disabled:opacity-60"
        >
          New {kind}
        </button>
      ))}
    </div>
  )
}
