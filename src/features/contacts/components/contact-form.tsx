import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FieldError, FieldGroup } from '@/components/ui/field'
import { ContactTextField } from '@/features/contacts/components/contact-text-field'
import {
  type ContactFormValues,
  contactFormSchema,
} from '@/features/contacts/types/contact-form-schema'
import { isAppError } from '@/lib/app-error'
import { logger } from '@/lib/logger'

const FALLBACK_ERROR = 'Could not save the contact. Try again.'

interface ContactFormProps {
  /** Lets a button outside the form submit it (`form={id}`). */
  id: string
  defaultValues: ContactFormValues
  /** Rejects with an ApiError to show server errors on the form. */
  onSubmit: (values: ContactFormValues) => Promise<void>
}

export function ContactForm({ id, defaultValues, onSubmit }: ContactFormProps) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues,
  })

  async function handleValidSubmit(values: ContactFormValues) {
    try {
      await onSubmit(values)
    } catch (error) {
      if (!isAppError(error)) {
        logger.error('Saving the contact failed unexpectedly', { error })
        form.setError('root.server', { message: FALLBACK_ERROR })
        return
      }
      // Field errors from the server go on their fields; anything else
      // (e.g. CUSTOMER_ARCHIVED) is shown for the whole form.
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
        <ContactTextField
          control={form.control}
          name="firstName"
          label="First name"
          autoComplete="off"
        />
        <ContactTextField
          control={form.control}
          name="lastName"
          label="Last name"
          autoComplete="off"
        />
        <ContactTextField
          control={form.control}
          name="jobTitle"
          label="Job title (optional)"
          autoComplete="off"
        />
        <ContactTextField
          control={form.control}
          name="email"
          label="Email (optional)"
          type="email"
          autoComplete="off"
        />
        <ContactTextField
          control={form.control}
          name="phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="off"
        />
        {serverError && (
          <FieldError className="sm:col-span-2">{serverError}</FieldError>
        )}
      </FieldGroup>
    </form>
  )
}

function isFormField(field: string): field is keyof ContactFormValues {
  return field in contactFormSchema.shape
}
