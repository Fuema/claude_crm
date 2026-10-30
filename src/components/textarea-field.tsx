import { useId } from 'react'
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface TextareaFieldProps<TValues extends FieldValues> {
  control: Control<TValues>
  name: FieldPath<TValues>
  label: string
  rows?: number
  className?: string
}

/** A labelled multi-line text field bound to a react-hook-form field. */
export function TextareaField<TValues extends FieldValues>({
  control,
  name,
  label,
  rows = 4,
  className,
}: TextareaFieldProps<TValues>) {
  const inputId = useId()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={cn(className)}>
          <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
          <Textarea
            {...field}
            value={field.value ?? ''}
            id={inputId}
            rows={rows}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
