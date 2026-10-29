import type { RowData, TableFeatures } from '@tanstack/react-table'

// Callbacks a page hands to its cells through the DataTable `meta` prop, so
// columns can stay at module scope. Cells read them from `table.options.meta`.
// `TableMeta` is declared in table-core (installed with react-table, which
// only re-exports it), so the augmentation has to target that module.
declare module '@tanstack/table-core' {
  interface TableMeta<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Merging requires the library's exact type parameters.
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
  > {
    /** Opens the edit form for a row, e.g. from a row actions menu. */
    onEditRow?: (row: TData) => void
    /** Asks to delete a row, e.g. from a row actions menu. */
    onDeleteRow?: (row: TData) => void
  }
}

/** Server-side pagination state. `page` is 1-based. */
export interface DataTablePaginationState {
  page: number
  pageSize: number
  /** Total number of rows on the server, across all pages. */
  total: number
}

export type DataTablePageChange = Pick<
  DataTablePaginationState,
  'page' | 'pageSize'
>

/** Server-side sorting by one column; `null` means the server's default order. */
export type DataTableSorting = { id: string; desc: boolean } | null

/** The search box. Omit it to hide the box. */
export interface DataTableSearch {
  /** The current search, e.g. from the URL. */
  value: string
  /** Called 300 ms after the user stops typing. Reset to page 1 here. */
  onChange: (value: string) => void
  /** Visible label; defaults to "Search". */
  label?: string
}

/** Page sizes offered in the "Rows per page" select. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
