import { type ReactNode, useId } from 'react'
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Radix Select items cannot have an empty value, so "no choice" (an empty
// form value) is offered as this sentinel when `emptyLabel` is set.
const EMPTY = 'none'

export interface SelectFieldOption {
  value: string
  label: string
}

interface SelectFieldProps<TValues extends FieldValues> {
  control: Control<TValues>
  name: FieldPath<TValues>
  label: string
  placeholder?: string
  options: SelectFieldOption[]
  /** Offers an option for the empty value, e.g. "No contact". */
  emptyLabel?: string
  disabled?: boolean
  /** Called after the user picks an option. */
  onPick?: (value: string) => void
  /** Shown under the select, e.g. why it has no options. */
  children?: ReactNode
}

/** A labelled shadcn Select bound to a react-hook-form field of string values. */
export function SelectField<TValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  emptyLabel,
  disabled = false,
  onPick,
  children,
}: SelectFieldProps<TValues>) {
  const triggerId = useId()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={triggerId}>{label}</FieldLabel>
          <Select
            name={field.name}
            value={field.value === '' && emptyLabel ? EMPTY : field.value}
            onValueChange={(value) => {
              const next = value === EMPTY && emptyLabel ? '' : value
              field.onChange(next)
              onPick?.(next)
            }}
            disabled={disabled}
          >
            <SelectTrigger
              id={triggerId}
              ref={field.ref}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid}
              className="w-full"
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {emptyLabel && (
                <SelectItem value={EMPTY}>{emptyLabel}</SelectItem>
              )}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {children}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
