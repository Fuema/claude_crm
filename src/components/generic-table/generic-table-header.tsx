import type { ReactTable, RowData } from '@tanstack/react-table'
import { DataTableSortButton, toAriaSort } from '@/components/data-table'
import type { GenericTableFeatures } from '@/components/generic-table/columns'
import { TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface GenericTableHeaderProps<TData extends RowData> {
  table: ReactTable<GenericTableFeatures, TData>
}

/** Header rows; sortable columns get a sort button and `aria-sort`. */
export function GenericTableHeader<TData extends RowData>({
  table,
}: GenericTableHeaderProps<TData>) {
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
