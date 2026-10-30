import { z } from 'zod'
import { PAGE_SIZE_OPTIONS } from '@/components/data-table'
import { customerStatusSchema } from '@/features/customers/types/customer'
import { customerFormSchema } from '@/features/customers/types/customer-form-schema'
import { customerSortSchema } from '@/features/customers/types/customer-search'

// Server-function inputs. Each reuses the form schema, so the browser and the
// server validate the same rules.

export const listCustomersSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.literal(PAGE_SIZE_OPTIONS),
  q: z.string().trim().max(200),
  status: customerStatusSchema.optional(),
  sort: customerSortSchema.optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export const customerOptionsSchema = z.object({
  status: z.enum(['active', 'all']),
})

export const customerIdSchema = z.object({ customerId: z.string().min(1) })

/** `idempotencyKey`: one per opened form, reused if the submit is retried. */
export const createCustomerSchema = customerFormSchema.extend({
  idempotencyKey: z.uuid(),
})

export const updateCustomerSchema = customerFormSchema.extend({
  customerId: z.string().min(1),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
