import { type ReactNode, useId } from 'react'
import { type Control, Controller } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DealFormValues } from '@/features/deals/types/deal-form-schema'

// Radix Select items cannot have an empty value, so "no choice" (an empty
// form value) is offered as this sentinel when `emptyLabel` is set.
const EMPTY = 'none'

interface DealSelectFieldProps {
  control: Control<DealFormValues>
  name: 'customerId' | 'contactId' | 'currency' | 'stage'
  label: string
  placeholder?: string
  options: { value: string; label: string }[]
  /** Offers an option for the empty value, e.g. "No contact". */
  emptyLabel?: string
  disabled?: boolean
  /** Called after the user picks an option. */
  onPick?: (value: string) => void
  /** Shown under the select, e.g. why it has no options. */
  children?: ReactNode
}

/** A labelled shadcn Select bound to a deal form field. */
export function DealSelectField({
  control,
  name,
  label,
  placeholder,
  options,
  emptyLabel,
  disabled = false,
  onPick,
  children,
}: DealSelectFieldProps) {
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
