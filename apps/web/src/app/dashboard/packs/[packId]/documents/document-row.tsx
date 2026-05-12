'use client'

import { useTransition, useState } from 'react'
import type { SourceDocument } from '@hyperspeed/db/schema'
import { deleteDocument, getDocumentDownloadUrl } from '@/lib/documents/actions'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
}

export function DocumentRow({
  document: doc,
  canDelete,
}: {
  document: SourceDocument
  canDelete: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [textOpen, setTextOpen] = useState(false)

  async function openDownload() {
    const url = await getDocumentDownloadUrl(doc.id)
    window.open(url, '_blank')
  }

  return (
    <div className="rounded-lg border border-[var(--color-border-base)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openDownload}
              className="truncate text-left text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-deep)]"
            >
              {doc.filename}
            </button>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                STATUS_STYLES[doc.textExtractionStatus] ?? 'bg-slate-100 text-slate-700'
              }`}
            >
              {doc.textExtractionStatus}
            </span>
          </div>
          <div className="mt-1 text-xs text-[var(--color-slate-soft)]">
            {formatBytes(doc.fileSizeBytes)} · uploaded {new Date(doc.createdAt).toLocaleString()}
            {doc.extractedText
              ? ` · ${Math.round(doc.extractedText.length / 100) / 10}k chars extracted`
              : ''}
          </div>
          {doc.extractionError ? (
            <p className="mt-2 text-xs text-red-700">{doc.extractionError}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {doc.extractedText && doc.extractedText.length > 0 ? (
            <button
              type="button"
              onClick={() => setTextOpen((v) => !v)}
              className="text-xs text-[var(--color-slate-soft)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
            >
              {textOpen ? 'Hide text' : 'View text'}
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm('Delete this document? This cannot be undone.')) return
                startTransition(() => {
                  void deleteDocument(doc.id)
                })
              }}
              className="text-xs text-[var(--color-slate-soft)] underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-60"
            >
              {pending ? '…' : 'Delete'}
            </button>
          ) : null}
        </div>
      </div>
      {textOpen && doc.extractedText ? (
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--color-primary-pale)] p-3 font-mono text-[11px] text-[var(--color-ink)]">
          {doc.extractedText.length > 4000
            ? doc.extractedText.slice(0, 4000) + '\n\n[…truncated…]'
            : doc.extractedText}
        </pre>
      ) : null}
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
