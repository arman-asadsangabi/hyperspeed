'use client'

import { useTransition, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { switchActiveOrg } from '@/lib/auth/orgs'
import type { Organization, OrganizationMember } from '@hyperspeed/db/schema'

interface OrgSwitcherProps {
  activeOrgId: string
  memberships: { organization: Organization; member: OrganizationMember }[]
}

export function OrgSwitcher({ activeOrgId, memberships }: OrgSwitcherProps) {
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const active = memberships.find((m) => m.organization.id === activeOrgId)?.organization

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-primary-pale)]"
        disabled={pending}
      >
        <span>{active?.name ?? 'Select organization'}</span>
        <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-56 rounded-md border border-[var(--color-border-base)] bg-white py-1 shadow-md">
          {memberships.map((m) => (
            <button
              key={m.organization.id}
              type="button"
              onClick={() => {
                setOpen(false)
                startTransition(() => {
                  void switchActiveOrg(m.organization.id)
                })
              }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-[var(--color-primary-pale)] ${
                m.organization.id === activeOrgId
                  ? 'font-medium text-[var(--color-primary-deep)]'
                  : 'text-[var(--color-ink)]'
              }`}
            >
              <span>{m.organization.name}</span>
              <span className="text-xs text-[var(--color-slate-soft)]">{m.member.role}</span>
            </button>
          ))}
          <div className="my-1 border-t border-[var(--color-border-base)]" />
          <Link
            href="/onboarding"
            className="block px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]"
            onClick={() => setOpen(false)}
          >
            + Create new organization
          </Link>
        </div>
      ) : null}
    </div>
  )
}
