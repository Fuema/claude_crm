import {
  type PaginationState,
  type ReactTable,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type TableMeta,
  type Updater,
  useTable,
} from '@tanstack/react-table'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  type DataTablePageChange,
  DataTablePagination,
  type DataTablePaginationState,
  DataTableToolbar,
  describePageRange,
} from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import {
  createGenericTableColumnHelper,
  type GenericTableColumns,
  type GenericTableFeatures,
  genericTableFeatures,
} from '@/components/generic-table/columns'
import { GenericTableBody } from '@/components/generic-table/generic-table-body'
import { GenericTableHeader } from '@/components/generic-table/generic-table-header'
import {
  DEFAULT_GENERIC_TABLE_STATE,
  type GenericTableState,
} from '@/components/generic-table/state'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableCaption } from '@/components/ui/table'

/** Turns on the checkbox column and the actions for the selected rows. */
export interface GenericTableSelection<TData extends RowData> {
  /** Names a row for its checkbox, e.g. "Select Ada Lovelace". Keep stable. */
  getRowLabel: (row: TData) => string
  /**
   * Shown while rows are selected, e.g. a "Delete 3 employees" button.
   * Rows that leave `data` (e.g. deleted) drop out of the selection.
   */
  actions: (selected: TData[]) => ReactNode
}

interface GenericTableProps<TData extends RowData> {
  /** Build with `createGenericTableColumnHelper<TData>().columns([...])`; keep stable. */
  columns: GenericTableColumns<TData>
  /** Every row; the table searches, sorts, and pages them in the browser. */
  data: TData[]
  getRowId: (row: TData) => string
  /** Accessible name of the table, e.g. "Employees". */
  caption: string
  /** Visible label of the search box; defaults to "Search". */
  searchLabel?: string
  /**
   * Search, sort, and page. Omit to let the table keep them itself; pass
   * with `onStateChange` to keep them elsewhere, e.g. in the URL.
   */
  state?: GenericTableState
  /**
   * `replace` is true when the table only corrects the page (e.g. it no
   * longer exists after a delete); a URL should replace, not add, an entry.
   */
  onStateChange?: (
    state: GenericTableState,
    options: { replace: boolean },
  ) => void
  selection?: GenericTableSelection<TData>
  isLoading?: boolean
  /** Safe-to-show message; when set, the error state replaces the table. */
  errorMessage?: string
  onRetry?: () => void
  /** Shown when there are no rows at all. Defaults to a generic "No results". */
  emptyState?: ReactNode
  /** Callbacks for cells (e.g. row actions), read via `table.options.meta`. */
  meta?: TableMeta<GenericTableFeatures, TData>
}

/**
 * Presentational table for a list small enough to load at once: search,
 * sorting, pagination, and row selection all happen in the browser. For
 * lists the server pages, use DataTable. Searching or sorting goes back to
 * the first page; searching also clears the selection, so an action never
 * reaches rows the search hides.
 */
export function GenericTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  caption,
  searchLabel,
  state,
  onStateChange,
  selection,
  isLoading = false,
  errorMessage,
  onRetry,
  emptyState,
  meta,
}: GenericTableProps<TData>) {
  const [ownState, setOwnState] = useState(DEFAULT_GENERIC_TABLE_STATE)
  const view = state ?? ownState
  function setView(next: GenericTableState, replace = false) {
    if (!state) setOwnState(next)
    onStateChange?.(next, { replace })
  }

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  // A new search (typed, or from the URL) starts a new selection.
  const [selectionSearch, setSelectionSearch] = useState(view.search)
  if (view.search !== selectionSearch) {
    setSelectionSearch(view.search)
    setRowSelection({})
  }
  // Drop rows that left the data, e.g. after they were deleted.
  const rowIds = new Set(data.map(getRowId))
  const selectedIds = Object.keys(rowSelection)
  if (!isLoading && selectedIds.some((id) => !rowIds.has(id))) {
    setRowSelection(
      Object.fromEntries(
        Object.entries(rowSelection).filter(([id]) => rowIds.has(id)),
      ),
    )
  }

  const getRowLabel = selection?.getRowLabel
  const allColumns = useMemo(
    () =>
      getRowLabel ? [createSelectColumn(getRowLabel), ...columns] : columns,
    [columns, getRowLabel],
  )

  // The number of rows matching the search, from the last render. After
  // rows are deleted, the requested page may no longer exist: show the last.
  const [matchCount, setMatchCount] = useState(data.length)
  const lastPage = Math.max(1, Math.ceil(matchCount / view.pageSize))
  const page = Math.min(view.page, lastPage)

  const sorting: SortingState = view.sorting ? [view.sorting] : []
  function handleSortingChange(updater: Updater<SortingState>) {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    setView({ ...view, sorting: next[0] ?? null, page: 1 })
  }

  const table = useTable({
    features: genericTableFeatures,
    columns: allColumns,
    data,
    getRowId,
    state: {
      globalFilter: view.search,
      sorting,
      pagination: { pageIndex: page - 1, pageSize: view.pageSize },
      rowSelection,
    },
    onSortingChange: handleSortingChange,
    onPaginationChange: (updater: Updater<PaginationState>) => {
      const current = { pageIndex: page - 1, pageSize: view.pageSize }
      const next = typeof updater === 'function' ? updater(current) : updater
      setView({ ...view, page: next.pageIndex + 1, pageSize: next.pageSize })
    },
    onRowSelectionChange: setRowSelection,
    globalFilterFn: 'includesString',
    enableRowSelection: Boolean(selection),
    enableMultiSort: false,
    sortDescFirst: false,
    // The page changes only through the view: a refetch keeps it.
    autoResetPageIndex: false,
    defaultColumn: { enableSorting: false },
    meta,
  })

  const total = table.getFilteredRowModel().rows.length
  if (total !== matchCount) {
    setMatchCount(total)
  }
  // Keep the stored page in step with the page shown, so it does not jump
  // back when rows return. Our own state is adjusted while rendering; an
  // owner (e.g. the URL) is told once the render settles.
  const showsCorrectedPage =
    !isLoading && !errorMessage && total > 0 && page !== view.page
  if (!state && showsCorrectedPage) {
    setOwnState({ ...ownState, page })
  }
  useEffect(() => {
    if (state && showsCorrectedPage) {
      onStateChange?.({ ...state, page }, { replace: true })
    }
  })

  const selected = table.getSelectedRowModel().rows.map((row) => row.original)
  const pagination = { page, pageSize: view.pageSize, total }

  // Always mounted, so changes (e.g. results → "No results") are announced.
  // The selection count is left out: each checkbox announces its own state.
  let status = ''
  if (isLoading) status = 'Loading'
  else if (!errorMessage) status = describePageRange(pagination)

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        search={{
          value: view.search,
          onChange: (search) => setView({ ...view, search, page: 1 }),
          label: searchLabel,
        }}
      >
        {selection && selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <span className="text-sm text-muted-foreground">
              {selected.length} selected
            </span>
            {selection.actions(selected)}
            <Button variant="ghost" onClick={() => setRowSelection({})}>
              Clear selection
            </Button>
          </div>
        )}
      </DataTableToolbar>
      <p role="status" className="sr-only">
        {status}
      </p>
      <GenericTableContent
        table={table}
        caption={caption}
        hasRows={data.length > 0}
        pagination={pagination}
        onPaginationChange={({ page: nextPage, pageSize }) =>
          setView({ ...view, page: nextPage, pageSize })
        }
        onClearSearch={() => setView({ ...view, search: '', page: 1 })}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onRetry={onRetry}
        emptyState={emptyState}
      />
    </div>
  )
}

interface GenericTableContentProps<TData extends RowData> {
  table: ReactTable<GenericTableFeatures, TData>
  caption: string
  hasRows: boolean
  pagination: DataTablePaginationState
  onPaginationChange: (change: DataTablePageChange) => void
  onClearSearch: () => void
  isLoading: boolean
  errorMessage?: string
  onRetry?: () => void
  emptyState?: ReactNode
}

/** The error, empty, no-matches, or table-with-pagination part. */
function GenericTableContent<TData extends RowData>({
  table,
  caption,
  hasRows,
  pagination,
  onPaginationChange,
  onClearSearch,
  isLoading,
  errorMessage,
  onRetry,
  emptyState,
}: GenericTableContentProps<TData>) {
  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={onRetry} />
  }
  if (!isLoading && !hasRows) {
    return emptyState ?? <EmptyState title="No results" />
  }
  if (!isLoading && pagination.total === 0) {
    return (
      <EmptyState
        title="No matches"
        description="Try a different search."
        action={
          <Button variant="outline" onClick={onClearSearch}>
            Clear search
          </Button>
        }
      />
    )
  }
  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table aria-busy={isLoading}>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <GenericTableHeader table={table} />
          <GenericTableBody
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

function createSelectColumn<TData extends RowData>(
  getRowLabel: (row: TData) => string,
) {
  const helper = createGenericTableColumnHelper<TData>()
  return helper.display({
    id: 'select',
    enableGlobalFilter: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows on this page"
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : false
        }
        onCheckedChange={(checked) =>
          table.toggleAllPageRowsSelected(checked === true)
        }
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${getRowLabel(row.original)}`}
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
      />
    ),
  })
}
