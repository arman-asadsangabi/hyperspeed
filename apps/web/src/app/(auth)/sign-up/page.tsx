'use client'

import { useActionState } from 'react'
import { signUp, type AuthState } from '@/lib/auth/actions'
import { AuthCard } from '@/components/auth/auth-card'
import { AuthInput } from '@/components/auth/auth-input'
import { SubmitButton } from '@/components/auth/submit-button'

export default function SignUpPage() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, {})

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start building with Hyperspeed"
      footer={{ text: 'Already have an account?', linkText: 'Sign in', linkHref: '/sign-in' }}
    >
      <form action={action} className="space-y-4">
        <AuthInput
          label="Full name"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          errors={state.fieldErrors?.fullName}
        />
        <AuthInput
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          errors={state.fieldErrors?.email}
        />
        <AuthInput
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          errors={state.fieldErrors?.password}
        />
        {state.error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}
        <SubmitButton>Create account</SubmitButton>
      </form>
    </AuthCard>
  )
}
