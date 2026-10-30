import { z } from 'zod'
import { PAGE_SIZE_OPTIONS } from '@/components/data-table'
import { type DealStage, dealStageSchema } from '@/features/deals/types/deal'

export const dealSortSchema = z.enum(['title', 'expectedCloseDate'])

export type DealSort = z.infer<typeof dealSortSchema>

/**
 * The list's URL search params. Every field is optional and falls back to
 * `undefined` when invalid, so a hand-edited URL never breaks the page.
 */
export const dealSearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  pageSize: z.literal(PAGE_SIZE_OPTIONS).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  stage: dealStageSchema.optional().catch(undefined),
  customer: z.string().min(1).optional().catch(undefined),
  sort: dealSortSchema.optional().catch(undefined),
  order: z.enum(['asc', 'desc']).optional().catch(undefined),
})

export type DealSearch = z.infer<typeof dealSearchSchema>

/** What the list query sends to the server, with defaults applied. */
export interface DealListParams {
  page: number
  pageSize: number
  q: string
  stage?: DealStage
  customerId?: string
  sort?: DealSort
  order?: 'asc' | 'desc'
}

export const DEFAULT_PAGE_SIZE = 10

export function toDealListParams(search: DealSearch): DealListParams {
  return {
    page: search.page ?? 1,
    pageSize: search.pageSize ?? DEFAULT_PAGE_SIZE,
    q: search.q?.trim() ?? '',
    stage: search.stage,
    customerId: search.customer,
    sort: search.sort,
    order: search.sort ? (search.order ?? 'asc') : undefined,
  }
}
