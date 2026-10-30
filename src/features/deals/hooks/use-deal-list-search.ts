import { getRouteApi } from '@tanstack/react-router'
import {
  type DataTablePageChange,
  type DataTableSorting,
  PAGE_SIZE_OPTIONS,
} from '@/components/data-table'
import type { DealStage } from '@/features/deals/types/deal'
import {
  DEFAULT_PAGE_SIZE,
  type DealListParams,
  type DealSearch,
  dealSortSchema,
  toDealListParams,
} from '@/features/deals/types/deal-search'

const routeApi = getRouteApi('/_authenticated/deals/')

export interface UseDealListSearchResult {
  /** The list request, with defaults filled in. */
  params: DealListParams
  sorting: DataTableSorting
  /** True when a search or filter narrows the list. */
  hasFilters: boolean
  setSearchText: (q: string) => void
  setStage: (stage: DealStage | undefined) => void
  setCustomer: (customerId: string | undefined) => void
  setSorting: (sorting: DataTableSorting) => void
  setPage: (change: DataTablePageChange) => void
  clearFilters: () => void
}

/**
 * The list's state lives in the URL (`?q=…&stage=won`). This hook reads it
 * and turns table events into URL updates. Search and filter changes go
 * back to page 1; defaults are left out of the URL.
 */
export function useDealListSearch(): UseDealListSearchResult {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const params = toDealListParams(search)

  function update(changes: Partial<DealSearch>, keepPage = false) {
    void navigate({
      search: (previous) => ({
        ...previous,
        ...changes,
        ...(keepPage ? {} : { page: undefined }),
      }),
    })
  }

  const sorting: DataTableSorting = params.sort
    ? { id: params.sort, desc: params.order === 'desc' }
    : null

  return {
    params,
    sorting,
    hasFilters: Boolean(params.q || params.stage || params.customerId),
    setSearchText: (q: string) => update({ q: q || undefined }),
    setStage: (stage: DealStage | undefined) => update({ stage }),
    setCustomer: (customer: string | undefined) => update({ customer }),
    setSorting: (next: DataTableSorting) => {
      const sort = dealSortSchema.safeParse(next?.id)
      update({
        sort: sort.success ? sort.data : undefined,
        order: sort.success && next?.desc ? 'desc' : undefined,
      })
    },
    setPage: ({ page, pageSize }: DataTablePageChange) =>
      update(
        {
          page: page > 1 ? page : undefined,
          pageSize:
            pageSize === DEFAULT_PAGE_SIZE
              ? undefined
              : PAGE_SIZE_OPTIONS.find((size) => size === pageSize),
        },
        true,
      ),
    clearFilters: () =>
      update({ q: undefined, stage: undefined, customer: undefined }),
  }
}
