import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FieldError, FieldGroup } from '@/components/ui/field'
import { CustomerTextField } from '@/features/customers/components/customer-text-field'
import {
  type CustomerFormValues,
  customerFormSchema,
} from '@/features/customers/types/customer-form-schema'
import { isAppError } from '@/lib/app-error'
import { logger } from '@/lib/logger'

const FALLBACK_ERROR = 'Could not save the customer. Try again.'

interface CustomerFormProps {
  /** Lets a button outside the form submit it (`form={id}`). */
  id: string
  defaultValues: CustomerFormValues
  /** Rejects with an AppError to show server errors on the form. */
  onSubmit: (values: CustomerFormValues) => Promise<void>
}

export function CustomerForm({
  id,
  defaultValues,
  onSubmit,
}: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues,
  })

  async function handleValidSubmit(values: CustomerFormValues) {
    try {
      await onSubmit(values)
    } catch (error) {
      if (!isAppError(error)) {
        logger.error('Saving the customer failed unexpectedly', { error })
        form.setError('root.server', { message: FALLBACK_ERROR })
        return
      }
      // Field errors from the server (e.g. NAME_TAKEN) go on their fields;
      // anything else (e.g. CUSTOMER_ARCHIVED) is shown for the whole form.
      let hasFieldError = false
      for (const [field, messages] of Object.entries(error.details ?? {})) {
        if (isFormField(field) && messages[0]) {
          form.setError(field, { message: messages[0] }, { shouldFocus: true })
          hasFieldError = true
        }
      }
      if (!hasFieldError) {
        form.setError('root.server', { message: error.message })
      }
    }
  }

  const serverError = form.formState.errors.root?.server?.message

  return (
    <form
      id={id}
      method="post"
      noValidate
      onSubmit={(event) => void form.handleSubmit(handleValidSubmit)(event)}
    >
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <CustomerTextField
          control={form.control}
          name="name"
          label="Name"
          autoComplete="organization"
        />
        <CustomerTextField
          control={form.control}
          name="industry"
          label="Industry (optional)"
          autoComplete="off"
        />
        <CustomerTextField
          control={form.control}
          name="website"
          label="Website (optional)"
          type="url"
          autoComplete="url"
        />
        <CustomerTextField
          control={form.control}
          name="email"
          label="Email (optional)"
          type="email"
          autoComplete="off"
        />
        <CustomerTextField
          control={form.control}
          name="phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="off"
        />
        <CustomerTextField
          control={form.control}
          name="address"
          label="Address (optional)"
          autoComplete="street-address"
          className="sm:col-span-2"
        />
        {serverError && (
          <FieldError className="sm:col-span-2">{serverError}</FieldError>
        )}
      </FieldGroup>
    </form>
  )
}

function isFormField(field: string): field is keyof CustomerFormValues {
  return field in customerFormSchema.shape
}
