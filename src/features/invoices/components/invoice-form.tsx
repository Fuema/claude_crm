import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { SelectField } from '@/components/select-field'
import { TextField } from '@/components/text-field'
import { TextareaField } from '@/components/textarea-field'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup } from '@/components/ui/field'
import { useCustomerOptions } from '@/features/customers'
import { useWonDealOptions } from '@/features/deals'
import { InvoiceTotals } from '@/features/invoices/components/invoice-totals'
import {
  EMPTY_INVOICE_LINE,
  type InvoiceFormValues,
  invoiceFormSchema,
  MAX_INVOICE_LINES,
} from '@/features/invoices/types/invoice-form-schema'
import {
  AMOUNT_PATTERN,
  computeInvoiceTotals,
  TAX_RATE_PATTERN,
} from '@/features/invoices/types/invoice-money'
import { currencySchema } from '@/lib/currency'
import { showSubmitError } from '@/lib/form-errors'
import { formatMoney } from '@/lib/format'
import type { LookupOption } from '@/types/lookup-option'

const CURRENCY_OPTIONS = currencySchema.options.map((currency) => ({
  value: currency,
  label: currency,
}))

const FIELDS = [
  'customerId',
  'dealId',
  'currency',
  'taxRate',
  'dueDate',
  'notes',
  'lines',
] as const

interface InvoiceFormProps {
  /** Lets a button outside the form submit it (`form={id}`). */
  id: string
  defaultValues: InvoiceFormValues
  /** Set when editing: the customer never changes. */
  fixedCustomer?: LookupOption
  onSubmit: (values: InvoiceFormValues) => Promise<void>
}

/** A draft invoice: customer, optional Won deal, terms, and line items. */
export function InvoiceForm({
  id,
  defaultValues,
  fixedCustomer,
  onSubmit,
}: InvoiceFormProps) {
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
  })
  const lines = useFieldArray({ control: form.control, name: 'lines' })
  const customers = useCustomerOptions('active', {
    enabled: fixedCustomer === undefined,
  })
  const customerId = useWatch({ control: form.control, name: 'customerId' })
  const deals = useWonDealOptions(customerId || undefined)
  const watchedLines = useWatch({ control: form.control, name: 'lines' })
  const taxRate = useWatch({ control: form.control, name: 'taxRate' })
  const currency = useWatch({ control: form.control, name: 'currency' })

  // A preview from what is valid so far; the server computes the real totals.
  const preview = computeInvoiceTotals(
    watchedLines.map((line) => ({
      quantity: AMOUNT_PATTERN.test(line.quantity.trim()) ? line.quantity : '0',
      unitPrice: AMOUNT_PATTERN.test(line.unitPrice.trim())
        ? line.unitPrice
        : '0',
    })),
    TAX_RATE_PATTERN.test(taxRate.trim()) ? taxRate : '0',
  )

  async function handleValidSubmit(values: InvoiceFormValues) {
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
  const linesError = form.formState.errors.lines?.root?.message

  return (
    <form
      id={id}
      method="post"
      noValidate
      onSubmit={(event) => void form.handleSubmit(handleValidSubmit)(event)}
      className="flex flex-col gap-8"
    >
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
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
          // Another customer's deals do not apply.
          onPick={() => form.setValue('dealId', '')}
        >
          {customers.isError && !fixedCustomer && (
            <p role="alert" className="text-sm text-destructive">
              Could not load customers. Reload the page and try again.
            </p>
          )}
        </SelectField>
        <SelectField
          control={form.control}
          name="dealId"
          label="Won deal (optional)"
          placeholder="Select a deal"
          emptyLabel="No deal"
          options={(deals.data ?? []).map(toSelectOption)}
          disabled={!customerId || !deals.data}
          // An invoice for a deal is usually in the deal's currency.
          onPick={(dealId) => {
            const deal = deals.data?.find((option) => option.id === dealId)
            if (deal) {
              form.setValue('currency', deal.currency)
            }
          }}
        />
        <SelectField
          control={form.control}
          name="currency"
          label="Currency"
          options={CURRENCY_OPTIONS}
        />
        <TextField control={form.control} name="taxRate" label="Tax rate (%)" />
        <TextField
          control={form.control}
          name="dueDate"
          label="Due date (optional)"
          type="date"
        />
      </FieldGroup>

      <section aria-labelledby={`${id}-lines`} className="flex flex-col gap-4">
        <h2 id={`${id}-lines`} className="text-lg font-semibold">
          Line items
        </h2>
        {lines.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No lines yet. A draft can be saved without lines, but it needs one
            to be sent.
          </p>
        )}
        {lines.fields.map((line, index) => (
          <fieldset
            key={line.id}
            className="grid gap-4 rounded-lg border p-4 sm:grid-cols-[1fr_8rem_10rem_8rem_auto] sm:items-start"
          >
            <legend className="px-1 text-sm font-medium">
              Line {index + 1}
            </legend>
            <TextField
              control={form.control}
              name={`lines.${index}.description`}
              label="Description"
            />
            <TextField
              control={form.control}
              name={`lines.${index}.quantity`}
              label="Quantity"
            />
            <TextField
              control={form.control}
              name={`lines.${index}.unitPrice`}
              label="Unit price"
            />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Amount</span>
              <output className="py-1.5 tabular-nums">
                {formatMoney(preview.lineAmounts[index] ?? '0.00', currency)}
              </output>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="sm:mt-7"
              aria-label={`Remove line ${index + 1}`}
              onClick={() => lines.remove(index)}
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </fieldset>
        ))}
        {linesError && <FieldError>{linesError}</FieldError>}
        <div>
          <Button
            type="button"
            variant="outline"
            disabled={lines.fields.length >= MAX_INVOICE_LINES}
            onClick={() => lines.append(EMPTY_INVOICE_LINE)}
          >
            <PlusIcon aria-hidden="true" />
            Add line
          </Button>
        </div>
        <InvoiceTotals
          currency={currency}
          taxRate={TAX_RATE_PATTERN.test(taxRate.trim()) ? taxRate : '0'}
          subtotal={preview.subtotal}
          tax={preview.tax}
          total={preview.total}
        />
      </section>

      <TextareaField
        control={form.control}
        name="notes"
        label="Notes (optional)"
      />
      {serverError && <FieldError>{serverError}</FieldError>}
    </form>
  )
}

function toSelectOption(option: LookupOption) {
  return { value: option.id, label: option.name }
}
