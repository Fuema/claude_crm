import { z } from 'zod'
import type { Invoice } from '@/features/invoices/types/invoice'
import {
  AMOUNT_PATTERN,
  TAX_RATE_PATTERN,
  toCents,
} from '@/features/invoices/types/invoice-money'
import { currencySchema } from '@/lib/currency'

export const MAX_INVOICE_LINES = 100
export const DESCRIPTION_MAX_LENGTH = 500
export const NOTES_MAX_LENGTH = 2000

const AMOUNT_ERROR =
  'Enter an amount up to 999999999.99, digits only, with at most 2 decimals'

export const invoiceLineSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Enter a description')
    .max(
      DESCRIPTION_MAX_LENGTH,
      `Use at most ${DESCRIPTION_MAX_LENGTH} characters`,
    ),
  quantity: z
    .string()
    .trim()
    .regex(AMOUNT_PATTERN, AMOUNT_ERROR)
    .refine((value) => toCents(value) > 0n, 'Enter more than 0'),
  unitPrice: z.string().trim().regex(AMOUNT_PATTERN, AMOUNT_ERROR),
})

export type InvoiceLineValues = z.infer<typeof invoiceLineSchema>

/**
 * Create and edit form for a draft. Rules come from docs/project.md
 * (Section 4, Invoice, and rules 28–33). Totals are computed, never entered.
 * A draft may have no lines yet; sending needs one (rule 28).
 */
export const invoiceFormSchema = z.object({
  customerId: z.string().min(1, 'Choose a customer'),
  dealId: z.string(),
  currency: currencySchema,
  taxRate: z
    .string()
    .trim()
    .regex(
      TAX_RATE_PATTERN,
      'Enter a rate from 0 to 100, with at most 2 decimals',
    ),
  dueDate: z
    .string()
    .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: 'Enter a valid date',
    }),
  notes: z
    .string()
    .trim()
    .max(NOTES_MAX_LENGTH, `Use at most ${NOTES_MAX_LENGTH} characters`),
  lines: z
    .array(invoiceLineSchema)
    .max(MAX_INVOICE_LINES, `Use at most ${MAX_INVOICE_LINES} lines`),
})

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

export const EMPTY_INVOICE_LINE: InvoiceLineValues = {
  description: '',
  quantity: '1',
  unitPrice: '',
}

export function newInvoiceFormValues(customerId = ''): InvoiceFormValues {
  return {
    customerId,
    dealId: '',
    currency: 'EUR',
    taxRate: '0',
    dueDate: '',
    notes: '',
    lines: [EMPTY_INVOICE_LINE],
  }
}

/** The form's values for editing a draft. */
export function toInvoiceFormValues(invoice: Invoice): InvoiceFormValues {
  return {
    customerId: invoice.customer.id,
    dealId: invoice.deal?.id ?? '',
    currency: invoice.currency,
    taxRate: trimZeroCents(invoice.taxRate),
    dueDate: invoice.dueDate ?? '',
    notes: invoice.notes ?? '',
    lines: invoice.lines.map((line) => ({
      description: line.description,
      quantity: trimZeroCents(line.quantity),
      unitPrice: line.unitPrice,
    })),
  }
}

/** "2.00" → "2", "19.50" stays: easier to read in a form field. */
function trimZeroCents(value: string): string {
  return value.endsWith('.00') ? value.slice(0, -3) : value
}
