import type { DataTableSorting } from '@/components/data-table'

/**
 * What a GenericTable shows: the search, the sorted column, and the page.
 * Kept by the table itself, or by the page (e.g. in the URL) through the
 * `state` and `onStateChange` props. Row selection always stays in the table.
 */
export interface GenericTableState {
  search: string
  /** One sorted column, or `null` for the data's own order. */
  sorting: DataTableSorting
  /** 1-based. */
  page: number
  pageSize: number
}

export const DEFAULT_GENERIC_TABLE_STATE: GenericTableState = {
  search: '',
  sorting: null,
  page: 1,
  pageSize: 10,
}
