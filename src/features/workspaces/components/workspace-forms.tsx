import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup } from '@/components/ui/field'
import {
  type CreateWorkspaceValues,
  createWorkspaceSchema,
  type InviteMemberValues,
  inviteMemberSchema,
} from '@/features/workspaces/types/workspace'
import { showSubmitError } from '@/lib/form-errors'

interface FormProps<TValues> {
  onSubmit: (values: TValues) => Promise<void>
}

export function CreateWorkspaceForm({
  onSubmit,
}: FormProps<CreateWorkspaceValues>) {
  const form = useForm<CreateWorkspaceValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: '' },
  })

  async function handleSubmit(values: CreateWorkspaceValues) {
    try {
      await onSubmit(values)
    } catch (error) {
      showSubmitError(error, form.setError, ['name'])
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
          label="Workspace name"
          autoComplete="organization"
        />
        {rootError && <FieldError>{rootError}</FieldError>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating…' : 'Create workspace'}
        </Button>
      </FieldGroup>
    </form>
  )
}

interface InviteMemberFormProps extends FormProps<InviteMemberValues> {
  /** Lets the dialog's footer button submit this form. */
  formId: string
}

export function InviteMemberForm({ formId, onSubmit }: InviteMemberFormProps) {
  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '' },
  })

  async function handleSubmit(values: InviteMemberValues) {
    try {
      await onSubmit(values)
    } catch (error) {
      showSubmitError(error, form.setError, ['email'])
    }
  }

  const rootError = form.formState.errors.root?.server?.message
  return (
    <form
      id={formId}
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
          autoComplete="off"
        />
        {rootError && <FieldError>{rootError}</FieldError>}
      </FieldGroup>
    </form>
  )
}
