import {
  type ColumnHelper,
  createColumnHelper,
  type RowData,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table'

/** The TanStack Table features every DataTable registers. */
export const dataTableFeatures = tableFeatures({ rowSortingFeature })

export type DataTableFeatures = typeof dataTableFeatures

/** The column list a DataTable accepts, as built by `helper.columns([...])`. */
export type DataTableColumns<TData extends RowData> = ReturnType<
  ColumnHelper<DataTableFeatures, TData>['columns']
>

/**
 * Column helper for a DataTable. Sorting is opt-in per column
 * (`enableSorting: true`), because the server decides what can be sorted.
 *
 * @example
 * const helper = createDataTableColumnHelper<Employee>()
 * const columns = helper.columns([
 *   helper.accessor('lastName', { header: 'Last name', enableSorting: true }),
 * ])
 */
export function createDataTableColumnHelper<
  TData extends RowData,
>(): ColumnHelper<DataTableFeatures, TData> {
  return createColumnHelper<DataTableFeatures, TData>()
}
