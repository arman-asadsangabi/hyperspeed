'use client'

import { useActionState } from 'react'
import { submitCredential, type CreatorActionState } from '@/lib/creators/actions'
import { AuthInput } from '@/components/auth/auth-input'
import { SubmitButton } from '@/components/auth/submit-button'

export function CredentialForm({ types }: { types: string[] }) {
  const [state, action] = useActionState<CreatorActionState, FormData>(submitCredential, {})

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-[var(--color-ink)]">Credential type</label>
        <select
          name="credentialType"
          required
          defaultValue="professional_license"
          className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>
      <AuthInput
        label="Title (e.g. CPA, JD)"
        name="title"
        type="text"
        required
        errors={state.fieldErrors?.title}
      />
      <AuthInput
        label="Issuing organization"
        name="issuingOrganization"
        type="text"
        required
        errors={state.fieldErrors?.issuingOrganization}
      />
      <AuthInput
        label="License number (optional)"
        name="licenseNumber"
        type="text"
        errors={state.fieldErrors?.licenseNumber}
      />
      <AuthInput
        label="Issue date (optional)"
        name="issueDate"
        type="date"
        errors={state.fieldErrors?.issueDate}
      />
      <AuthInput
        label="Expiration date (optional)"
        name="expirationDate"
        type="date"
        errors={state.fieldErrors?.expirationDate}
      />
      <AuthInput
        label="Supporting document URL (optional)"
        name="supportingDocumentUrl"
        type="url"
        placeholder="Link to license/diploma image"
        errors={state.fieldErrors?.supportingDocumentUrl}
      />
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <SubmitButton>Submit for review</SubmitButton>
      </div>
    </form>
  )
}
