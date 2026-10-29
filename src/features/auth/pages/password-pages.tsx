import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { CenteredCard } from '@/components/centered-card'
import {
  ForgotPasswordForm,
  ResetPasswordForm,
} from '@/features/auth/components/password-forms'
import {
  useRequestPasswordReset,
  useResetPassword,
} from '@/features/auth/hooks/use-auth-mutations'
import type {
  ForgotPasswordValues,
  ResetPasswordValues,
} from '@/features/auth/types/auth-schemas'

const backToSignIn = (
  <Link to="/sign-in" className="underline underline-offset-4">
    Back to sign in
  </Link>
)

export function ForgotPasswordPage() {
  const requestReset = useRequestPasswordReset()
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(values: ForgotPasswordValues) {
    await requestReset.mutateAsync(values)
    setSentTo(values.email)
  }

  return (
    <CenteredCard
      title="Reset your password"
      description={
        sentTo ? undefined : 'We will email you a link to set a new password.'
      }
      footer={backToSignIn}
    >
      {sentTo ? (
        // The same answer whether or not the account exists (rule 17).
        <p role="status">
          If an account exists for <strong>{sentTo}</strong>, we sent it a link.
          The link is valid for 1 hour.
        </p>
      ) : (
        <ForgotPasswordForm onSubmit={handleSubmit} />
      )}
    </CenteredCard>
  )
}

interface ResetPasswordPageProps {
  /** From the emailed link; missing or rejected when the link is bad. */
  token?: string
  linkError?: string
}

export function ResetPasswordPage({
  token,
  linkError,
}: ResetPasswordPageProps) {
  const router = useRouter()
  const resetPassword = useResetPassword()

  if (!token || linkError) {
    return (
      <CenteredCard title="This link does not work" footer={backToSignIn}>
        <p role="alert">
          The reset link is invalid or has expired.{' '}
          <Link to="/forgot-password" className="underline underline-offset-4">
            Ask for a new one
          </Link>
          .
        </p>
      </CenteredCard>
    )
  }

  async function handleSubmit(values: ResetPasswordValues) {
    if (!token) {
      return
    }
    await resetPassword.mutateAsync({ newPassword: values.password, token })
    await router.navigate({
      to: '/sign-in',
      search: { notice: 'password-reset' },
    })
  }

  return (
    <CenteredCard title="Choose a new password" footer={backToSignIn}>
      <ResetPasswordForm onSubmit={handleSubmit} />
    </CenteredCard>
  )
}
