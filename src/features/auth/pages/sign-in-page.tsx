import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { CenteredCard } from '@/components/centered-card'
import { Button } from '@/components/ui/button'
import { SignInForm } from '@/features/auth/components/sign-in-form'
import {
  useResendVerification,
  useSignIn,
} from '@/features/auth/hooks/use-auth-mutations'
import type { SignInValues } from '@/features/auth/types/auth-schemas'
import { APP_NAME } from '@/lib/app-config'
import { AuthClientFailure } from '@/lib/auth-client'
import { errorMessage } from '@/lib/error-message'

export type SignInNotice = 'password-reset'

interface SignInPageProps {
  /** Internal path to open after signing in. */
  redirectTo?: string
  notice?: SignInNotice
}

export function SignInPage({ redirectTo = '/', notice }: SignInPageProps) {
  const router = useRouter()
  const signIn = useSignIn()
  const resend = useResendVerification()
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)

  async function handleSubmit(values: SignInValues) {
    setUnverifiedEmail(null)
    resend.reset()
    try {
      await signIn.mutateAsync(values)
    } catch (error) {
      if (
        error instanceof AuthClientFailure &&
        error.code === 'EMAIL_NOT_VERIFIED'
      ) {
        setUnverifiedEmail(values.email)
      }
      return
    }
    await router.navigate({ href: redirectTo })
  }

  return (
    <CenteredCard
      title={`Sign in to ${APP_NAME}`}
      description="Enter your email and password."
      footer={
        <>
          <Link to="/forgot-password" className="underline underline-offset-4">
            Forgot your password?
          </Link>
          <p>
            New here?{' '}
            <Link to="/sign-up" className="underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </>
      }
    >
      {notice === 'password-reset' && (
        <p role="status" className="text-sm">
          Your password was changed. Sign in with the new one.
        </p>
      )}
      <SignInForm
        onSubmit={handleSubmit}
        errorMessage={signIn.error ? errorMessage(signIn.error) : undefined}
      />
      {unverifiedEmail &&
        (resend.isSuccess ? (
          <p role="status" className="text-sm">
            We sent a new link to {unverifiedEmail}.
          </p>
        ) : (
          <Button
            variant="outline"
            disabled={resend.isPending}
            onClick={() =>
              resend.mutate({
                email: unverifiedEmail,
                callbackURL: redirectTo,
              })
            }
          >
            {resend.isPending ? 'Sending…' : 'Send the link again'}
          </Button>
        ))}
      {resend.error && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(resend.error)}
        </p>
      )}
    </CenteredCard>
  )
}
