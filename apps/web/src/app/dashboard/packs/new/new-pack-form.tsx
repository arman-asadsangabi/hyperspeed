'use client'

import { useActionState, useState } from 'react'
import { createPack, type PackActionState } from '@/lib/packs/actions'
import { AuthInput } from '@/components/auth/auth-input'
import { SubmitButton } from '@/components/auth/submit-button'
import type { Category } from '@hyperspeed/db/schema'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function NewPackForm({ categories }: { categories: Category[] }) {
  const [state, action] = useActionState<PackActionState, FormData>(createPack, {})
  const [slug, setSlug] = useState('')

  return (
    <form action={action} className="space-y-4">
      <AuthInput
        label="Pack name"
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
        placeholder="cpa-tax-2026"
        errors={state.fieldErrors?.slug}
      />

      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)]">Category</label>
        <select
          name="categoryId"
          className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          defaultValue=""
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)]">Description</label>
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          placeholder="What expertise does this pack capture?"
        />
        {state.fieldErrors?.description?.[0] ? (
          <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.description[0]}</p>
        ) : null}
      </div>

      <AuthInput
        label="Target use case (optional)"
        name="targetUseCase"
        type="text"
        placeholder="Sole-proprietor tax filing in California"
        errors={state.fieldErrors?.targetUseCase}
      />

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="pt-2">
        <SubmitButton>Create pack</SubmitButton>
      </div>
    </form>
  )
}
