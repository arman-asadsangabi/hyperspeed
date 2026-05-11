'use client'

import { useActionState, useState } from 'react'
import { createOrganization, type OrgActionState } from '@/lib/auth/orgs'
import { AuthInput } from '@/components/auth/auth-input'
import { SubmitButton } from '@/components/auth/submit-button'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function CreateOrgForm({ defaultBillingEmail }: { defaultBillingEmail: string }) {
  const [state, action] = useActionState<OrgActionState, FormData>(createOrganization, {})
  const [slug, setSlug] = useState('')

  return (
    <form action={action} className="space-y-4">
      <AuthInput
        label="Organization name"
        name="name"
        type="text"
        required
        autoFocus
        onChange={(e) => setSlug(slugify(e.currentTarget.value))}
        errors={state.fieldErrors?.name}
      />
      <AuthInput
        label="URL slug"
        name="slug"
        type="text"
        required
        value={slug}
        onChange={(e) => setSlug(e.currentTarget.value)}
        placeholder="acme-corp"
        errors={state.fieldErrors?.slug}
      />
      <AuthInput
        label="Billing email"
        name="billingEmail"
        type="email"
        defaultValue={defaultBillingEmail}
        errors={state.fieldErrors?.billingEmail}
      />
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <SubmitButton>Create organization</SubmitButton>
    </form>
  )
}
