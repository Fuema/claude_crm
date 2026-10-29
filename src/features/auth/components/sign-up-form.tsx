import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup } from '@/components/ui/field'
import {
  PASSWORD_MIN_LENGTH,
  type SignUpValues,
  signUpSchema,
} from '@/features/auth/types/auth-schemas'
import { showSubmitError } from '@/lib/form-errors'

interface SignUpFormProps {
  /** Set when signing up from an invitation: no workspace is created. */
  invitationId?: string
  onSubmit: (values: SignUpValues) => Promise<void>
}

export function SignUpForm({ invitationId, onSubmit }: SignUpFormProps) {
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      workspaceName: '',
      invitationId,
    },
  })

  async function handleSubmit(values: SignUpValues) {
    try {
      await onSubmit(values)
    } catch (error) {
      showSubmitError(error, form.setError, [
        'name',
        'email',
        'password',
        'workspaceName',
      ])
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
          name="name"
          label="Your name"
          autoComplete="name"
        />
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
          autoComplete="new-password"
          description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        {!invitationId && (
          <TextField
            control={form.control}
            name="workspaceName"
            label="Workspace name"
            autoComplete="organization"
            description="Usually your company's name. You can invite colleagues later."
          />
        )}
        {rootError && <FieldError>{rootError}</FieldError>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </FieldGroup>
    </form>
  )
}
