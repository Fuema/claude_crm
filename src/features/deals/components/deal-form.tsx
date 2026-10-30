import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { FieldError, FieldGroup } from '@/components/ui/field'
import { useContactOptions } from '@/features/contacts'
import { useCustomerOptions } from '@/features/customers'
import { DealSelectField } from '@/features/deals/components/deal-select-field'
import { DealTextField } from '@/features/deals/components/deal-text-field'
import {
  currencySchema,
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
} from '@/features/deals/types/deal'
import {
  type DealFormValues,
  dealFormSchema,
} from '@/features/deals/types/deal-form-schema'
import { isAppError } from '@/lib/app-error'
import { logger } from '@/lib/logger'
import type { LookupOption } from '@/types/lookup-option'

const FALLBACK_ERROR = 'Could not save the deal. Try again.'

const STAGE_OPTIONS = DEAL_STAGES.map((stage) => ({
  value: stage,
  label: DEAL_STAGE_LABELS[stage],
}))

const CURRENCY_OPTIONS = currencySchema.options.map((currency) => ({
  value: currency,
  label: currency,
}))

interface DealFormProps {
  /** Lets a button outside the form submit it (`form={id}`). */
  id: string
  defaultValues: DealFormValues
  /**
   * Set when the customer cannot be picked: when editing (it never changes)
   * or when adding from a customer's page. Shown as the only option.
   */
  fixedCustomer?: LookupOption
  /** Rejects with an ApiError to show server errors on the form. */
  onSubmit: (values: DealFormValues) => Promise<void>
}

export function DealForm({
  id,
  defaultValues,
  fixedCustomer,
  onSubmit,
}: DealFormProps) {
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues,
  })
  const customers = useCustomerOptions('active', {
    enabled: fixedCustomer === undefined,
  })
  const customerId = useWatch({ control: form.control, name: 'customerId' })
  const contacts = useContactOptions(customerId || undefined)

  async function handleValidSubmit(values: DealFormValues) {
    try {
      await onSubmit(values)
    } catch (error) {
      if (!isAppError(error)) {
        logger.error('Saving the deal failed unexpectedly', { error })
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

  const customerOptions = (
    fixedCustomer ? [fixedCustomer] : (customers.data ?? [])
  ).map(toSelectOption)
  const serverError = form.formState.errors.root?.server?.message

  return (
    <form
      id={id}
      method="post"
      noValidate
      onSubmit={(event) => void form.handleSubmit(handleValidSubmit)(event)}
    >
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <DealTextField
          control={form.control}
          name="title"
          label="Title"
          className="sm:col-span-2"
        />
        <DealSelectField
          control={form.control}
          name="customerId"
          label="Customer"
          placeholder={
            fixedCustomer || customers.data || customers.isError
              ? 'Select a customer'
              : 'Loading customers…'
          }
          options={customerOptions}
          disabled={fixedCustomer !== undefined || !customers.data}
          // Another customer's contacts do not apply.
          onPick={() => form.setValue('contactId', '')}
        >
          {customers.isError && !fixedCustomer && (
            <p role="alert" className="text-sm text-destructive">
              Could not load customers. Close the form and try again.
            </p>
          )}
        </DealSelectField>
        <DealSelectField
          control={form.control}
          name="contactId"
          label="Contact (optional)"
          placeholder="Select a contact"
          emptyLabel="No contact"
          options={(contacts.data ?? []).map(toSelectOption)}
          disabled={!customerId || !contacts.data}
        >
          {contacts.isError && (
            <p role="alert" className="text-sm text-destructive">
              Could not load this customer’s contacts. Close the form and try
              again.
            </p>
          )}
        </DealSelectField>
        <DealTextField
          control={form.control}
          name="value"
          label="Value"
          inputMode="decimal"
        />
        <DealSelectField
          control={form.control}
          name="currency"
          label="Currency"
          options={CURRENCY_OPTIONS}
        />
        <DealSelectField
          control={form.control}
          name="stage"
          label="Stage"
          options={STAGE_OPTIONS}
        />
        <DealTextField
          control={form.control}
          name="expectedCloseDate"
          label="Expected close date (optional)"
          type="date"
        />
        {serverError && (
          <FieldError className="sm:col-span-2">{serverError}</FieldError>
        )}
      </FieldGroup>
    </form>
  )
}

function toSelectOption(option: LookupOption) {
  return { value: option.id, label: option.name }
}

function isFormField(field: string): field is keyof DealFormValues {
  return field in dealFormSchema.shape
}
