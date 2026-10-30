import { useId } from 'react'
import { type Control, Controller, type FieldPath } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { DealFormValues } from '@/features/deals/types/deal-form-schema'

interface DealTextFieldProps {
  control: Control<DealFormValues>
  name: FieldPath<DealFormValues>
  label: string
  type?: 'text' | 'date'
  /** "decimal" brings up a number keyboard on phones. */
  inputMode?: 'text' | 'decimal'
  className?: string
}

/** A labelled text input bound to a deal form field. */
export function DealTextField({
  control,
  name,
  label,
  type = 'text',
  inputMode,
  className,
}: DealTextFieldProps) {
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
            inputMode={inputMode}
            autoComplete="off"
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
