import type { ReactTable, RowData } from '@tanstack/react-table'
import type { DataTableFeatures } from '@/components/data-table/columns'
import { Skeleton } from '@/components/ui/skeleton'
import { TableBody, TableCell, TableRow } from '@/components/ui/table'

const MAX_SKELETON_ROWS = 10

interface DataTableBodyProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>
  isLoading: boolean
  pageSize: number
}

export function DataTableBody<TData extends RowData>({
  table,
  isLoading,
  pageSize,
}: DataTableBodyProps<TData>) {
  const columnCount = table.getAllLeafColumns().length
  const rows = table.getRowModel().rows

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

  if (rows.length === 0) {
    // Only reached past the last page (the table shows the empty state when
    // there are no results at all); the pagination offers the way back.
    return (
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={columnCount}
            className="py-6 text-center text-muted-foreground"
          >
            No rows on this page.
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }

  return (
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.id}>
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
