import type { ReactTable, RowData } from '@tanstack/react-table'
import type { DataTableFeatures } from '@/components/data-table/columns'
import { DataTableSortButton } from '@/components/data-table/data-table-sort-button'
import { toAriaSort } from '@/components/data-table/sort-direction'
import { TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DataTableHeaderProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>
}

/** Header rows; sortable columns get a sort button and `aria-sort`. */
export function DataTableHeader<TData extends RowData>({
  table,
}: DataTableHeaderProps<TData>) {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((group) => (
        <TableRow key={group.id}>
          {group.headers.map((header) => {
            const canSort = header.column.getCanSort()
            const direction = header.column.getIsSorted()
            return (
              <TableHead
                key={header.id}
                aria-sort={canSort ? toAriaSort(direction) : undefined}
              >
                {header.isPlaceholder ? null : canSort ? (
                  <DataTableSortButton
                    direction={direction}
                    onToggle={() => header.column.toggleSorting()}
                  >
                    <table.FlexRender header={header} />
                  </DataTableSortButton>
                ) : (
                  <table.FlexRender header={header} />
                )}
              </TableHead>
            )
          })}
        </TableRow>
      ))}
    </TableHeader>
  )
}
