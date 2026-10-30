import { z } from 'zod'
import { PAGE_SIZE_OPTIONS } from '@/components/data-table'
import { dealStageSchema } from '@/features/deals/types/deal'
import { dealFormSchema } from '@/features/deals/types/deal-form-schema'
import { dealSortSchema } from '@/features/deals/types/deal-search'

// Server-function inputs, built from the form schema so the browser and the
// server validate the same rules. The value stays text until the service
// turns it into a Decimal, so it never passes through a float.

export const listDealsSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.literal(PAGE_SIZE_OPTIONS),
  q: z.string().trim().max(200),
  stage: dealStageSchema.optional(),
  customerId: z.string().min(1).optional(),
  sort: dealSortSchema.optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export const boardDealsSchema = z.object({
  customerId: z.string().min(1).optional(),
})

export const customerDealsSchema = z.object({ customerId: z.string().min(1) })

export const dealIdSchema = z.object({ dealId: z.string().min(1) })

export const createDealSchema = dealFormSchema

/** The customer is fixed after create (rule 13), so it is not sent. */
export const updateDealSchema = dealFormSchema
  .omit({ customerId: true })
  .extend({ dealId: z.string().min(1) })

export const changeDealStageSchema = z.object({
  dealId: z.string().min(1),
  stage: dealStageSchema,
})

export type UpdateDealValues = Omit<z.infer<typeof updateDealSchema>, 'dealId'>
