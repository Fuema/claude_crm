import { z } from 'zod'
import { PAGE_SIZE_OPTIONS } from '@/components/data-table'
import { invoiceStatusSchema } from '@/features/invoices/types/invoice'
import { invoiceFormSchema } from '@/features/invoices/types/invoice-form-schema'

// Server-function inputs, built from the form schema so the browser and the
// server validate the same rules.

export const listInvoicesSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.literal(PAGE_SIZE_OPTIONS),
  status: invoiceStatusSchema.optional(),
  customerId: z.string().min(1).optional(),
})

export type InvoiceListParams = z.infer<typeof listInvoicesSchema>

export const customerInvoicesSchema = z.object({
  customerId: z.string().min(1),
})

export const invoiceIdSchema = z.object({ invoiceId: z.string().min(1) })

/** `idempotencyKey`: one per opened form, reused if the submit is retried. */
export const createInvoiceSchema = invoiceFormSchema.extend({
  idempotencyKey: z.uuid(),
})

/** The customer is fixed after create, so it is not sent. */
export const updateInvoiceSchema = invoiceFormSchema
  .omit({ customerId: true })
  .extend({ invoiceId: z.string().min(1) })

export type UpdateInvoiceValues = Omit<
  z.infer<typeof updateInvoiceSchema>,
  'invoiceId'
>

/** The status changes rule 30 allows, as actions. */
export const invoiceActionSchema = z.object({
  invoiceId: z.string().min(1),
  action: z.enum(['send', 'markPaid', 'void']),
})

export type InvoiceAction = z.infer<typeof invoiceActionSchema>['action']
