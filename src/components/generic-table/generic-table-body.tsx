import type { ReactTable, RowData } from '@tanstack/react-table'
import type { GenericTableFeatures } from '@/components/generic-table/columns'
import { Skeleton } from '@/components/ui/skeleton'
import { TableBody, TableCell, TableRow } from '@/components/ui/table'

const MAX_SKELETON_ROWS = 10

interface GenericTableBodyProps<TData extends RowData> {
  table: ReactTable<GenericTableFeatures, TData>
  isLoading: boolean
  pageSize: number
}

export function GenericTableBody<TData extends RowData>({
  table,
  isLoading,
  pageSize,
}: GenericTableBodyProps<TData>) {
  const columnCount = table.getAllLeafColumns().length

  if (isLoading) {
    const rowCount = Math.min(pageSize, MAX_SKELETON_ROWS)
    return (
      <TableBody>
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows have no data to key by.
          <TableRow key={`skeleton-${rowIndex}`}>
            {Array.from({ length: columnCount }, (_, cellIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: placeholder cells have no data to key by.
              <TableCell key={`skeleton-${rowIndex}-${cellIndex}`}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    )
  }

  return (
    <TableBody>
      {table.getRowModel().rows.map((row) => (
        <TableRow
          key={row.id}
          data-state={row.getIsSelected() ? 'selected' : undefined}
        >
          {row.getAllCells().map((cell) => (
            <TableCell key={cell.id}>
              <table.FlexRender cell={cell} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}
