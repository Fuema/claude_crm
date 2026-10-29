import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { CenteredCard } from '@/components/centered-card'
import { SignUpForm } from '@/features/auth/components/sign-up-form'
import { useSignUp } from '@/features/auth/hooks/use-auth-mutations'
import type { SignUpValues } from '@/features/auth/types/auth-schemas'
import { APP_NAME } from '@/lib/app-config'

interface SignUpPageProps {
  /** Set when the user came from an invitation link. */
  invitationId?: string
}

export function SignUpPage({ invitationId }: SignUpPageProps) {
  const signUp = useSignUp()
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(values: SignUpValues) {
    await signUp.mutateAsync(values)
    setSentTo(values.email)
  }

  if (sentTo) {
    return (
      <CenteredCard title="Check your email">
        <p role="status">
          We sent a link to <strong>{sentTo}</strong>. Open it to verify your
          email and sign in.
        </p>
        <p className="text-sm text-muted-foreground">
          No email after a few minutes? Check your spam folder, or{' '}
          <Link to="/sign-in" className="underline underline-offset-4">
            sign in
          </Link>{' '}
          to get a new link.
        </p>
      </CenteredCard>
    )
  }

  return (
    <CenteredCard
      title={`Create your ${APP_NAME} account`}
      description={
        invitationId
          ? 'Create an account to accept the invitation.'
          : 'Your account and a workspace for your team.'
      }
      footer={
        <p>
          Already have an account?{' '}
          <Link
            to="/sign-in"
            search={
              invitationId
                ? { redirect: `/accept-invitation/${invitationId}` }
                : {}
            }
            className="underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <SignUpForm invitationId={invitationId} onSubmit={handleSubmit} />
    </CenteredCard>
  )
}
