import { z } from 'zod'
import { PAGE_SIZE_OPTIONS } from '@/components/data-table'
import { invoiceStatusSchema } from '@/features/invoices/types/invoice'
import type { InvoiceListParams } from '@/features/invoices/types/invoice-inputs'

/**
 * The invoice list's URL search params. Invalid values fall back to
 * `undefined`, so a hand-edited URL never breaks the page.
 */
export const invoiceSearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  pageSize: z.literal(PAGE_SIZE_OPTIONS).optional().catch(undefined),
  status: invoiceStatusSchema.optional().catch(undefined),
  customer: z.string().min(1).optional().catch(undefined),
})

export type InvoiceSearch = z.infer<typeof invoiceSearchSchema>

export const DEFAULT_PAGE_SIZE = 10

export function toInvoiceListParams(search: InvoiceSearch): InvoiceListParams {
  return {
    page: search.page ?? 1,
    pageSize: search.pageSize ?? DEFAULT_PAGE_SIZE,
    status: search.status,
    customerId: search.customer,
  }
}

/** The new-invoice page's search: the customer to invoice, if chosen. */
export const newInvoiceSearchSchema = z.object({
  customer: z.string().min(1).optional().catch(undefined),
})
