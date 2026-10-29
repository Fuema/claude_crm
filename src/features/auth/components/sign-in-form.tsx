import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup } from '@/components/ui/field'
import {
  type SignInValues,
  signInSchema,
} from '@/features/auth/types/auth-schemas'

interface SignInFormProps {
  onSubmit: (values: SignInValues) => Promise<void>
  /** Shown under the fields, e.g. wrong password or email not verified. */
  errorMessage?: string
}

export function SignInForm({ onSubmit, errorMessage }: SignInFormProps) {
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  return (
    <form
      method="post"
      noValidate
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
        />
        <TextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        {errorMessage && <FieldError>{errorMessage}</FieldError>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </FieldGroup>
    </form>
  )
}
