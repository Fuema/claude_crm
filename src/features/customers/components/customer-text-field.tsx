import { useId } from 'react'
import { type Control, Controller, type FieldPath } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { CustomerFormValues } from '@/features/customers/types/customer-form-schema'

interface CustomerTextFieldProps {
  control: Control<CustomerFormValues>
  name: FieldPath<CustomerFormValues>
  label: string
  type?: 'text' | 'email' | 'tel' | 'url'
  autoComplete?: string
  className?: string
}

/** A labelled text input bound to a customer form field. */
export function CustomerTextField({
  control,
  name,
  label,
  type = 'text',
  autoComplete,
  className,
}: CustomerTextFieldProps) {
  const inputId = useId()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
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
