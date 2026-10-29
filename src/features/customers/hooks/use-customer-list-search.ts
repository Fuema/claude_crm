import { getRouteApi } from '@tanstack/react-router'
import {
  type DataTablePageChange,
  type DataTableSorting,
  PAGE_SIZE_OPTIONS,
} from '@/components/data-table'
import {
  type CustomerListParams,
  type CustomerSearch,
  type CustomerStatusFilter,
  customerSortSchema,
  DEFAULT_PAGE_SIZE,
  DEFAULT_STATUS_FILTER,
  toCustomerListParams,
} from '@/features/customers/types/customer-search'

const routeApi = getRouteApi('/_authenticated/customers/')

export interface UseCustomerListSearchResult {
  /** The list request, with defaults filled in. */
  params: CustomerListParams
  statusFilter: CustomerStatusFilter
  sorting: DataTableSorting
  /** True when a search or a non-default filter narrows the list. */
  hasFilters: boolean
  setSearchText: (q: string) => void
  setStatusFilter: (status: CustomerStatusFilter) => void
  setSorting: (sorting: DataTableSorting) => void
  setPage: (change: DataTablePageChange) => void
  clearFilters: () => void
}

/**
 * The list's state lives in the URL (`?q=…&status=archived`). This hook
 * reads it and turns table events into URL updates. Search and filter
 * changes go back to page 1; defaults are left out of the URL.
 */
export function useCustomerListSearch(): UseCustomerListSearchResult {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const params = toCustomerListParams(search)
  const statusFilter = search.status ?? DEFAULT_STATUS_FILTER

  function update(changes: Partial<CustomerSearch>, keepPage = false) {
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

  const hasFilters = Boolean(params.q || statusFilter !== DEFAULT_STATUS_FILTER)

  return {
    params,
    statusFilter,
    sorting,
    hasFilters,
    setSearchText: (q: string) => update({ q: q || undefined }),
    setStatusFilter: (status: CustomerStatusFilter) =>
      update({ status: status === DEFAULT_STATUS_FILTER ? undefined : status }),
    setSorting: (next: DataTableSorting) => {
      const sort = customerSortSchema.safeParse(next?.id)
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
    clearFilters: () => update({ q: undefined, status: undefined }),
  }
}
