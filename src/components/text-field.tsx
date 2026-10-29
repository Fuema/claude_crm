import { useId } from 'react'
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface TextFieldProps<TValues extends FieldValues> {
  control: Control<TValues>
  name: FieldPath<TValues>
  label: string
  type?: 'text' | 'email' | 'password' | 'tel'
  autoComplete?: string
  description?: string
}

/**
 * A labelled text input bound to a react-hook-form field, with its error
 * linked for screen readers (the Field pattern in docs/data-and-api.md).
 */
export function TextField<TValues extends FieldValues>({
  control,
  name,
  label,
  type = 'text',
  autoComplete,
  description,
}: TextFieldProps<TValues>) {
  const inputId = useId()
  const descriptionId = useId()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
          <Input
            {...field}
            value={field.value ?? ''}
            id={inputId}
            type={type}
            autoComplete={autoComplete}
            aria-invalid={fieldState.invalid}
            aria-describedby={description ? descriptionId : undefined}
          />
          {description && (
            <FieldDescription id={descriptionId}>
              {description}
            </FieldDescription>
          )}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
