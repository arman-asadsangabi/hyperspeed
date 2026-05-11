'use client'

import { useActionState } from 'react'
import { acceptInvitation, type OrgActionState } from '@/lib/auth/orgs'
import { AuthInput } from '@/components/auth/auth-input'
import { SubmitButton } from '@/components/auth/submit-button'

export function AcceptInviteForm({ initialToken }: { initialToken?: string }) {
  const [state, action] = useActionState<OrgActionState, FormData>(acceptInvitation, {})

  return (
    <form action={action} className="space-y-4">
      <AuthInput
        label="Invitation token"
        name="token"
        type="text"
        required
        defaultValue={initialToken}
        placeholder="paste the UUID from your invite email"
        errors={state.fieldErrors?.token}
      />
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <SubmitButton>Join organization</SubmitButton>
    </form>
  )
}
