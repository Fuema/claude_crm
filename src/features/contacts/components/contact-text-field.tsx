import { useId } from 'react'
import { type Control, Controller, type FieldPath } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { ContactFormValues } from '@/features/contacts/types/contact-form-schema'

interface ContactTextFieldProps {
  control: Control<ContactFormValues>
  name: FieldPath<ContactFormValues>
  label: string
  type?: 'text' | 'email' | 'tel'
  autoComplete?: string
}

/** A labelled text input bound to a contact form field. */
export function ContactTextField({
  control,
  name,
  label,
  type = 'text',
  autoComplete,
}: ContactTextFieldProps) {
  const inputId = useId()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
          <Input
            {...field}
            id={inputId}
            type={type}
            autoComplete={autoComplete}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
