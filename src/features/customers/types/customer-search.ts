import { z } from 'zod'
import { PAGE_SIZE_OPTIONS } from '@/components/data-table'
import type { CustomerStatus } from '@/features/customers/types/customer'

export const customerSortSchema = z.enum(['name'])

export type CustomerSort = z.infer<typeof customerSortSchema>

/** The list's status filter. Active customers are shown unless the URL says otherwise. */
export const customerStatusFilterSchema = z.enum(['active', 'archived', 'all'])

export type CustomerStatusFilter = z.infer<typeof customerStatusFilterSchema>

export const DEFAULT_STATUS_FILTER: CustomerStatusFilter = 'active'

export const CUSTOMER_STATUS_FILTER_LABELS: Record<
  CustomerStatusFilter,
  string
> = {
  active: 'Active',
  archived: 'Archived',
  all: 'All statuses',
}

/**
 * The list's URL search params. Every field is optional and falls back to
 * `undefined` when invalid, so a hand-edited URL never breaks the page.
 */
export const customerSearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  pageSize: z.literal(PAGE_SIZE_OPTIONS).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  status: customerStatusFilterSchema.optional().catch(undefined),
  sort: customerSortSchema.optional().catch(undefined),
  order: z.enum(['asc', 'desc']).optional().catch(undefined),
})

export type CustomerSearch = z.infer<typeof customerSearchSchema>

/** What the list query sends to the server, with defaults applied. */
export interface CustomerListParams {
  page: number
  pageSize: number
  q: string
  /** Omitted: every customer, active and archived. */
  status?: CustomerStatus
  sort?: CustomerSort
  order?: 'asc' | 'desc'
}

export const DEFAULT_PAGE_SIZE = 10

export function toCustomerListParams(
  search: CustomerSearch,
): CustomerListParams {
  const statusFilter = search.status ?? DEFAULT_STATUS_FILTER
  return {
    page: search.page ?? 1,
    pageSize: search.pageSize ?? DEFAULT_PAGE_SIZE,
    q: search.q?.trim() ?? '',
    status: statusFilter === 'all' ? undefined : statusFilter,
    sort: search.sort,
    order: search.sort ? (search.order ?? 'asc') : undefined,
  }
}
