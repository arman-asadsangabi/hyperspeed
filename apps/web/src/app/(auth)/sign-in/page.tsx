'use client'

import { useActionState } from 'react'
import { signIn, type AuthState } from '@/lib/auth/actions'
import { AuthCard } from '@/components/auth/auth-card'
import { AuthInput } from '@/components/auth/auth-input'
import { SubmitButton } from '@/components/auth/submit-button'

export default function SignInPage() {
  const [state, action] = useActionState<AuthState, FormData>(signIn, {})

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to Hyperspeed"
      footer={{ text: 'No account yet?', linkText: 'Create one', linkHref: '/sign-up' }}
    >
      <form action={action} className="space-y-4">
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
          autoComplete="current-password"
          required
          errors={state.fieldErrors?.password}
        />
        {state.error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}
        <SubmitButton>Sign in</SubmitButton>
      </form>
    </AuthCard>
  )
}
