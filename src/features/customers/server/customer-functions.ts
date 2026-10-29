import { createServerFn } from '@tanstack/react-start'
import {
  archiveCustomer,
  createCustomer,
  getCustomer,
  listCustomers,
  restoreCustomer,
  updateCustomer,
} from '@/features/customers/server/customer-service'
import {
  createCustomerSchema,
  customerIdSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from '@/features/customers/types/customer-inputs'
import { getIdempotencyStore } from '@/server/idempotency'
import { tenantMiddleware } from '@/server/middleware/auth'
import { validateInput } from '@/server/validate'

export const fetchCustomers = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .validator(validateInput(listCustomersSchema))
  .handler(({ data, context }) => listCustomers(context.tenant, data))

export const fetchCustomer = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .validator(validateInput(customerIdSchema))
  .handler(({ data, context }) => getCustomer(context.tenant, data.customerId))

/** Idempotent: a retried submit of the same form returns the first customer. */
export const createCustomerFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(createCustomerSchema))
  .handler(({ data, context }) => {
    const { idempotencyKey, ...values } = data
    return getIdempotencyStore().run(
      context.tenantId,
      idempotencyKey,
      values,
      () => createCustomer(context.tenant, values),
    )
  })

export const updateCustomerFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(updateCustomerSchema))
  .handler(({ data, context }) => {
    const { customerId, ...values } = data
    return updateCustomer(context.tenant, customerId, values)
  })

export const archiveCustomerFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(customerIdSchema))
  .handler(({ data, context }) =>
    archiveCustomer(context.tenant, data.customerId),
  )

export const restoreCustomerFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(customerIdSchema))
  .handler(({ data, context }) =>
    restoreCustomer(context.tenant, data.customerId),
  )
