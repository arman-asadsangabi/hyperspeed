'use client'

import { useActionState } from 'react'
import type { CreatorProfile } from '@hyperspeed/db/schema'
import { updateCreatorProfile, type CreatorActionState } from '@/lib/creators/actions'
import { AuthInput } from '@/components/auth/auth-input'
import { SubmitButton } from '@/components/auth/submit-button'

export function ProfileForm({ profile }: { profile: CreatorProfile }) {
  const [state, action] = useActionState<CreatorActionState, FormData>(updateCreatorProfile, {})

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <AuthInput
        label="Display name"
        name="displayName"
        type="text"
        defaultValue={profile.displayName ?? ''}
        errors={state.fieldErrors?.displayName}
      />
      <AuthInput
        label="Years of experience"
        name="yearsExperience"
        type="number"
        min={0}
        max={80}
        defaultValue={profile.yearsExperience ?? ''}
        errors={state.fieldErrors?.yearsExperience}
      />
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-[var(--color-ink)]">
          Professional summary
        </label>
        <input
          type="text"
          name="professionalSummary"
          defaultValue={profile.professionalSummary ?? ''}
          maxLength={500}
          className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-[var(--color-ink)]">Bio</label>
        <textarea
          name="bio"
          rows={4}
          defaultValue={profile.bio ?? ''}
          maxLength={2000}
          className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
        />
      </div>
      <AuthInput
        label="LinkedIn URL"
        name="linkedinUrl"
        type="url"
        defaultValue={profile.linkedinUrl ?? ''}
        errors={state.fieldErrors?.linkedinUrl}
      />
      <AuthInput
        label="Personal website"
        name="personalWebsite"
        type="url"
        defaultValue={profile.personalWebsite ?? ''}
        errors={state.fieldErrors?.personalWebsite}
      />
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <SubmitButton>Save profile</SubmitButton>
      </div>
    </form>
  )
}
