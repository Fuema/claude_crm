import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup } from '@/components/ui/field'
import {
  type ForgotPasswordValues,
  forgotPasswordSchema,
  PASSWORD_MIN_LENGTH,
  type ResetPasswordValues,
  resetPasswordSchema,
} from '@/features/auth/types/auth-schemas'
import { showSubmitError } from '@/lib/form-errors'

interface FormProps<TValues> {
  onSubmit: (values: TValues) => Promise<void>
}

export function ForgotPasswordForm({
  onSubmit,
}: FormProps<ForgotPasswordValues>) {
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function handleSubmit(values: ForgotPasswordValues) {
    try {
      await onSubmit(values)
    } catch (error) {
      showSubmitError(error, form.setError, ['email'])
    }
  }

  const rootError = form.formState.errors.root?.server?.message
  return (
    <form
      method="post"
      noValidate
      onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
        />
        {rootError && <FieldError>{rootError}</FieldError>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </FieldGroup>
    </form>
  )
}

export function ResetPasswordForm({
  onSubmit,
}: FormProps<ResetPasswordValues>) {
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function handleSubmit(values: ResetPasswordValues) {
    try {
      await onSubmit(values)
    } catch (error) {
      showSubmitError(error, form.setError, ['password'])
    }
  }

  const rootError = form.formState.errors.root?.server?.message
  return (
    <form
      method="post"
      noValidate
      onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        <TextField
          control={form.control}
          name="confirmPassword"
          label="Repeat the new password"
          type="password"
          autoComplete="new-password"
        />
        {rootError && <FieldError>{rootError}</FieldError>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : 'Set new password'}
        </Button>
      </FieldGroup>
    </form>
  )
}
