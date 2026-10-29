import {
  type RowData,
  type SortingState,
  type TableMeta,
  type Updater,
  useTable,
} from '@tanstack/react-table'
import type { ReactNode } from 'react'
import {
  type DataTableColumns,
  type DataTableFeatures,
  dataTableFeatures,
} from '@/components/data-table/columns'
import { DataTableBody } from '@/components/data-table/data-table-body'
import { DataTableHeader } from '@/components/data-table/data-table-header'
import { DataTablePagination } from '@/components/data-table/data-table-pagination'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { describePageRange } from '@/components/data-table/page-range'
import type {
  DataTablePageChange,
  DataTablePaginationState,
  DataTableSearch,
  DataTableSorting,
} from '@/components/data-table/types'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Table, TableCaption } from '@/components/ui/table'

interface DataTableProps<TData extends RowData> {
  /** Build with `createDataTableColumnHelper<TData>().columns([...])`; keep stable. */
  columns: DataTableColumns<TData>
  /** The current page of rows from the server; keep stable between renders. */
  data: TData[]
  getRowId: (row: TData) => string
  /** Accessible name of the table, e.g. "Employees". */
  caption: string
  pagination: DataTablePaginationState
  onPaginationChange: (change: DataTablePageChange) => void
  sorting?: DataTableSorting
  onSortingChange?: (sorting: DataTableSorting) => void
  search?: DataTableSearch
  /** Feature filters shown next to the search box. */
  toolbar?: ReactNode
  isLoading?: boolean
  /** Safe-to-show message; when set, the error state replaces the table. */
  errorMessage?: string
  onRetry?: () => void
  /** Shown when there are no results. Defaults to a generic "No results". */
  emptyState?: ReactNode
  /** Callbacks for cells (e.g. row actions), read via `table.options.meta`. */
  meta?: TableMeta<DataTableFeatures, TData>
}

/**
 * Presentational table for server-side data: the server filters, sorts, and
 * paginates; this component renders and reports changes. All state is
 * controlled by the page (usually kept in URL search params).
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  caption,
  pagination,
  onPaginationChange,
  sorting = null,
  onSortingChange,
  search,
  toolbar,
  isLoading = false,
  errorMessage,
  onRetry,
  emptyState,
  meta,
}: DataTableProps<TData>) {
  const sortingState: SortingState = sorting ? [sorting] : []

  function handleSortingChange(updater: Updater<SortingState>) {
    const next = typeof updater === 'function' ? updater(sortingState) : updater
    onSortingChange?.(next[0] ?? null)
  }

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    state: { sorting: sortingState },
    onSortingChange: handleSortingChange,
    manualSorting: true,
    enableSorting: Boolean(onSortingChange),
    enableMultiSort: false,
    sortDescFirst: false,
    defaultColumn: { enableSorting: false },
    meta,
  })

  // Always mounted, so changes (e.g. results → "No results") are announced.
  let status = ''
  if (isLoading) status = 'Loading'
  else if (!errorMessage) status = describePageRange(pagination)

  let content: ReactNode
  if (errorMessage) {
    content = <ErrorState message={errorMessage} onRetry={onRetry} />
  } else if (!isLoading && pagination.total === 0) {
    content = emptyState ?? (
      <EmptyState
        title="No results"
        description="Try a different search or filter."
      />
    )
  } else {
    content = (
      <>
        <div className="overflow-x-auto rounded-lg border">
          <Table aria-busy={isLoading}>
            <TableCaption className="sr-only">{caption}</TableCaption>
            <DataTableHeader table={table} />
            <DataTableBody
              table={table}
              isLoading={isLoading}
              pageSize={pagination.pageSize}
            />
          </Table>
        </div>
        <DataTablePagination
          pagination={pagination}
          onPaginationChange={onPaginationChange}
        />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar search={search}>{toolbar}</DataTableToolbar>
      <p role="status" className="sr-only">
        {status}
      </p>
      {content}
    </div>
  )
}
