'use client'

import { useActionState } from 'react'
import { inviteMember, type OrgActionState } from '@/lib/auth/orgs'
import { AuthInput } from '@/components/auth/auth-input'
import { SubmitButton } from '@/components/auth/submit-button'

export function InviteMemberForm({ orgId }: { orgId: string }) {
  const bound = inviteMember.bind(null, orgId)
  const [state, action] = useActionState<OrgActionState, FormData>(bound, {})

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <AuthInput
          label="Email"
          name="email"
          type="email"
          required
          placeholder="teammate@example.com"
          errors={state.fieldErrors?.email}
        />
      </div>
      <div className="w-full sm:w-32">
        <label className="block text-sm font-medium text-[var(--color-ink)]">Role</label>
        <select
          name="role"
          className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <SubmitButton>Send invite</SubmitButton>
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
    </form>
  )
}
