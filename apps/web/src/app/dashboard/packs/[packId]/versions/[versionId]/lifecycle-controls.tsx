'use client'

import { useTransition } from 'react'
import { submitVersionForReview, publishVersion, archiveVersion } from '@/lib/packs/versions'

interface Props {
  versionId: string
  status: 'draft' | 'in_review' | 'published' | 'archived'
  entryCount: number
}

export function VersionLifecycleControls({ versionId, status, entryCount }: Props) {
  const [pending, startTransition] = useTransition()

  const Btn = ({
    label,
    onClick,
    danger,
    disabled,
  }: {
    label: string
    onClick: () => void
    danger?: boolean
    disabled?: boolean
  }) => (
    <button
      type="button"
      disabled={pending || disabled}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
        danger
          ? 'border border-[var(--color-border-base)] bg-white text-[var(--color-ink)] hover:border-red-300 hover:bg-red-50 hover:text-red-700'
          : 'bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-deep)]'
      }`}
    >
      {pending ? 'Working…' : label}
    </button>
  )

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'draft' ? (
        <Btn
          label="Submit for review"
          disabled={entryCount === 0}
          onClick={() =>
            startTransition(() => {
              void submitVersionForReview(versionId)
            })
          }
        />
      ) : null}
      {status === 'in_review' ? (
        <Btn
          label="Publish"
          onClick={() => {
            if (!confirm('Publish this version? It will become immutable.')) return
            startTransition(() => {
              void publishVersion(versionId)
            })
          }}
        />
      ) : null}
      {status === 'published' || status === 'draft' || status === 'in_review' ? (
        <Btn
          danger
          label="Archive"
          onClick={() => {
            if (!confirm('Archive this version?')) return
            startTransition(() => {
              void archiveVersion(versionId)
            })
          }}
        />
      ) : null}
    </div>
  )
}
