import { createServerFn } from '@tanstack/react-start'
import {
  applyInvoiceAction,
  createInvoice,
  getInvoice,
  listCustomerInvoices,
  listInvoices,
  updateInvoice,
} from '@/features/invoices/server/invoice-service'
import {
  createInvoiceSchema,
  customerInvoicesSchema,
  invoiceActionSchema,
  invoiceIdSchema,
  listInvoicesSchema,
  updateInvoiceSchema,
} from '@/features/invoices/types/invoice-inputs'
import { getIdempotencyStore } from '@/server/idempotency'
import { tenantMiddleware } from '@/server/middleware/auth'
import { validateInput } from '@/server/validate'

export const fetchInvoices = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .validator(validateInput(listInvoicesSchema))
  .handler(({ data, context }) => listInvoices(context.tenant, data))

export const fetchCustomerInvoices = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .validator(validateInput(customerInvoicesSchema))
  .handler(({ data, context }) =>
    listCustomerInvoices(context.tenant, data.customerId),
  )

export const fetchInvoice = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .validator(validateInput(invoiceIdSchema))
  .handler(({ data, context }) => getInvoice(context.tenant, data.invoiceId))

/** Idempotent: a retried submit of the same form returns the first draft. */
export const createInvoiceFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(createInvoiceSchema))
  .handler(({ data, context }) => {
    const { idempotencyKey, ...values } = data
    return getIdempotencyStore().run(
      context.tenantId,
      idempotencyKey,
      values,
      () => createInvoice(context.tenant, values),
    )
  })

export const updateInvoiceFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(updateInvoiceSchema))
  .handler(({ data, context }) => {
    const { invoiceId, ...values } = data
    return updateInvoice(context.tenant, invoiceId, values)
  })

export const invoiceActionFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(invoiceActionSchema))
  .handler(({ data, context }) =>
    applyInvoiceAction(context.tenant, data.invoiceId, data.action),
  )
