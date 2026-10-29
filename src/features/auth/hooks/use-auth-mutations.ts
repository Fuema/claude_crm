import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { signUpWithWorkspace } from '@/features/auth/server/auth-functions'
import type {
  ForgotPasswordValues,
  SignInValues,
  SignUpValues,
} from '@/features/auth/types/auth-schemas'
import { authClient, unwrapAuthResult } from '@/lib/auth-client'

export function useSignUp() {
  const signUp = useServerFn(signUpWithWorkspace)
  return useMutation({
    mutationFn: (values: SignUpValues) => signUp({ data: values }),
  })
}

/** On success the old user's cached data is dropped and guards re-run. */
export function useSignIn() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (values: SignInValues) =>
      unwrapAuthResult(authClient.signIn.email(values)),
    onSuccess: async () => {
      queryClient.clear()
      await router.invalidate()
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: () => unwrapAuthResult(authClient.signOut()),
    onSuccess: async () => {
      queryClient.clear()
      await router.navigate({ to: '/sign-in' })
    },
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (variables: { email: string; callbackURL: string }) =>
      unwrapAuthResult(authClient.sendVerificationEmail(variables)),
  })
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: ({ email }: ForgotPasswordValues) =>
      unwrapAuthResult(
        authClient.requestPasswordReset({
          email,
          redirectTo: '/reset-password',
        }),
      ),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (variables: { newPassword: string; token: string }) =>
      unwrapAuthResult(authClient.resetPassword(variables)),
  })
}
