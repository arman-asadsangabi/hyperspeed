'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { presignDocumentUpload, completeDocumentUpload } from '@/lib/documents/actions'

const ACCEPT = '.pdf,.docx,.txt,.md,.html'
const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  html: 'text/html',
}

export function DocumentUploader({ packId }: { packId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  async function handleUpload(file: File) {
    setError(null)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const mimeType = MIME_MAP[ext] ?? file.type
    if (!Object.values(MIME_MAP).includes(mimeType)) {
      setError(`Unsupported file type: ${file.type || ext}`)
      return
    }

    setProgress(`Preparing ${file.name}...`)
    let presign
    try {
      presign = await presignDocumentUpload({
        filename: file.name,
        mimeType,
        fileSizeBytes: file.size,
        packId,
      })
    } catch (e) {
      setProgress(null)
      setError(e instanceof Error ? e.message : 'Failed to prepare upload')
      return
    }

    setProgress(`Uploading ${file.name}...`)
    try {
      const res = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType, Authorization: `Bearer ${presign.token}` },
        body: file,
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`)
    } catch (e) {
      setProgress(null)
      setError(e instanceof Error ? e.message : 'Upload failed')
      return
    }

    setProgress(`Extracting text from ${file.name}...`)
    startTransition(async () => {
      try {
        await completeDocumentUpload(presign.documentId)
        setProgress(null)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Extraction failed')
        setProgress(null)
      }
    })
  }

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-ink)]">Upload a document</label>
      <p className="mt-1 text-xs text-[var(--color-slate-soft)]">
        PDF, DOCX, TXT, MD, or HTML. Max 50 MB.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        disabled={pending || progress !== null}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0]
          if (file) void handleUpload(file)
        }}
        className="mt-3 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[var(--color-primary-deep)]"
      />
      {progress ? <p className="mt-3 text-xs text-[var(--color-slate-soft)]">{progress}</p> : null}
      {error ? <p className="mt-3 text-xs text-red-700">{error}</p> : null}
    </div>
  )
}
