'use client'

import { useActionState } from 'react'
import {
  submitDesignPartnerApplication,
  type ApplicationActionState,
} from '@/lib/design_partners/actions'
import { AuthInput } from '@/components/auth/auth-input'
import { SubmitButton } from '@/components/auth/submit-button'

const DOMAINS = ['tax', 'legal', 'medical', 'financial', 'regulatory', 'other']
const BUDGETS = ['$25K–$50K', '$50K–$100K', '$100K+', 'Undecided']
const TIMELINES = ['Immediate', '3–6 months', 'Exploratory']

export function ApplicationForm() {
  const [state, action] = useActionState<ApplicationActionState, FormData>(
    submitDesignPartnerApplication,
    {},
  )

  if (state.ok)
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">Got it.</h2>
        <p className="mt-2 text-sm text-[var(--color-slate-soft)]">
          We&apos;ll be in touch within 2 business days. Check your inbox.
        </p>
      </div>
    )

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <AuthInput
        label="Company"
        name="companyName"
        type="text"
        required
        errors={state.fieldErrors?.companyName}
      />
      <AuthInput
        label="Contact name"
        name="contactName"
        type="text"
        errors={state.fieldErrors?.contactName}
      />
      <AuthInput
        label="Contact email"
        name="contactEmail"
        type="email"
        required
        errors={state.fieldErrors?.contactEmail}
      />
      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)]">Target domain</label>
        <select
          name="targetDomain"
          className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
        >
          {DOMAINS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)]">Budget</label>
        <select
          name="budgetRange"
          className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
        >
          {BUDGETS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)]">Timeline</label>
        <select
          name="timeline"
          className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
        >
          {TIMELINES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-[var(--color-ink)]">Use case</label>
        <textarea
          name="useCase"
          rows={4}
          maxLength={5000}
          className="shadow-xs mt-1.5 block w-full rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          placeholder="What expertise are you packaging? Who's the end user? What's the AI workflow?"
        />
      </div>
      <AuthInput label="How did you hear about us?" name="referralSource" type="text" />
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <SubmitButton>Submit application</SubmitButton>
      </div>
    </form>
  )
}
