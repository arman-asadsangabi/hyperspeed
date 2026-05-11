'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-primary-deep)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Working…' : children}
    </button>
  )
}
