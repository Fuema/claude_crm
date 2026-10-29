import {
  type ColumnHelper,
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  globalFilteringFeature,
  type RowData,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
} from '@tanstack/react-table'

/**
 * The TanStack Table features every GenericTable registers. Unlike DataTable,
 * the rows are filtered, sorted, and paginated in the browser.
 */
export const genericTableFeatures = tableFeatures({
  rowSortingFeature,
  // Global search is built on column filtering.
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns,
  sortFns,
})

export type GenericTableFeatures = typeof genericTableFeatures

/** The column list a GenericTable accepts, as built by `helper.columns([...])`. */
export type GenericTableColumns<TData extends RowData> = ReturnType<
  ColumnHelper<GenericTableFeatures, TData>['columns']
>

/**
 * Column helper for a GenericTable. Sorting is opt-in per column
 * (`enableSorting: true`). The search box matches every column with a
 * string or number value; set `enableGlobalFilter: false` to leave one out.
 *
 * @example
 * const helper = createGenericTableColumnHelper<Employee>()
 * const columns = helper.columns([
 *   helper.accessor('lastName', { header: 'Last name', enableSorting: true }),
 * ])
 */
export function createGenericTableColumnHelper<
  TData extends RowData,
>(): ColumnHelper<GenericTableFeatures, TData> {
  return createColumnHelper<GenericTableFeatures, TData>()
}
