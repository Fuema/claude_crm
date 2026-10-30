import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { SelectField } from '@/components/select-field'
import { TextField } from '@/components/text-field'
import { TextareaField } from '@/components/textarea-field'
import { FieldError, FieldGroup } from '@/components/ui/field'
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPES,
} from '@/features/activities/types/activity'
import {
  type ActivityFormValues,
  activityFormSchema,
} from '@/features/activities/types/activity-form-schema'
import { useContactOptions } from '@/features/contacts'
import { useCustomerOptions } from '@/features/customers'
import { useDealOptions } from '@/features/deals'
import { showSubmitError } from '@/lib/form-errors'
import type { LookupOption } from '@/types/lookup-option'

const TYPE_OPTIONS = ACTIVITY_TYPES.map((type) => ({
  value: type,
  label: ACTIVITY_TYPE_LABELS[type],
}))

const FIELDS = [
  'type',
  'subject',
  'date',
  'customerId',
  'contactId',
  'dealId',
  'notes',
] as const

interface ActivityFormProps {
  /** Lets a button outside the form submit it (`form={id}`). */
  id: string
  defaultValues: ActivityFormValues
  /**
   * Set when the customer cannot be picked: when editing (it never changes,
   * rule 24) or when logging from a customer's or deal's page.
   */
  fixedCustomer?: LookupOption
  onSubmit: (values: ActivityFormValues) => Promise<void>
}

export function ActivityForm({
  id,
  defaultValues,
  fixedCustomer,
  onSubmit,
}: ActivityFormProps) {
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues,
  })
  const customers = useCustomerOptions('active', {
    enabled: fixedCustomer === undefined,
  })
  const customerId = useWatch({ control: form.control, name: 'customerId' })
  const type = useWatch({ control: form.control, name: 'type' })
  const contacts = useContactOptions(customerId || undefined)
  const deals = useDealOptions(customerId || undefined)

  async function handleValidSubmit(values: ActivityFormValues) {
    try {
      await onSubmit(values)
    } catch (error) {
      showSubmitError(error, form.setError, FIELDS)
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
        <SelectField
          control={form.control}
          name="type"
          label="Type"
          options={TYPE_OPTIONS}
        />
        <TextField
          control={form.control}
          name="date"
          label={type === 'task' ? 'Due date' : 'Date'}
          type="date"
        />
        <div className="sm:col-span-2">
          <TextField control={form.control} name="subject" label="Subject" />
        </div>
        <SelectField
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
          // Another customer's contacts and deals do not apply.
          onPick={() => {
            form.setValue('contactId', '')
            form.setValue('dealId', '')
          }}
        >
          {customers.isError && !fixedCustomer && (
            <p role="alert" className="text-sm text-destructive">
              Could not load customers. Close the form and try again.
            </p>
          )}
        </SelectField>
        <SelectField
          control={form.control}
          name="contactId"
          label="Contact (optional)"
          placeholder="Select a contact"
          emptyLabel="No contact"
          options={(contacts.data ?? []).map(toSelectOption)}
          disabled={!customerId || !contacts.data}
        />
        <SelectField
          control={form.control}
          name="dealId"
          label="Deal (optional)"
          placeholder="Select a deal"
          emptyLabel="No deal"
          options={(deals.data ?? []).map(toSelectOption)}
          disabled={!customerId || !deals.data}
        />
        <TextareaField
          control={form.control}
          name="notes"
          label="Notes (optional)"
          className="sm:col-span-2"
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
