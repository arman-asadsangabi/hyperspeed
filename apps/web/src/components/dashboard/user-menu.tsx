'use client'

import { useState, useRef, useEffect } from 'react'
import { signOut } from '@/lib/auth/actions'
import type { User } from '@hyperspeed/db/schema'

export function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const initials = (user.fullName ?? user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-medium text-white hover:bg-[var(--color-primary-deep)]"
      >
        {initials || '?'}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-60 rounded-md border border-[var(--color-border-base)] bg-white py-1 shadow-md">
          <div className="px-3 py-2">
            <div className="truncate text-sm font-medium text-[var(--color-ink)]">
              {user.fullName ?? user.email}
            </div>
            <div className="truncate text-xs text-[var(--color-slate-soft)]">{user.email}</div>
          </div>
          <div className="my-1 border-t border-[var(--color-border-base)]" />
          <form action={signOut}>
            <button
              type="submit"
              className="block w-full px-3 py-1.5 text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-primary-pale)]"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
