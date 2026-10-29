import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useId } from 'react'
import {
  describePageRange,
  getPageRange,
} from '@/components/data-table/page-range'
import {
  type DataTablePageChange,
  type DataTablePaginationState,
  PAGE_SIZE_OPTIONS,
} from '@/components/data-table/types'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DataTablePaginationProps {
  pagination: DataTablePaginationState
  onPaginationChange: (change: DataTablePageChange) => void
}

export function DataTablePagination({
  pagination,
  onPaginationChange,
}: DataTablePaginationProps) {
  const { page, pageSize } = pagination
  const labelId = useId()
  const { pageCount } = getPageRange(pagination)
  // Keep an unexpected size (e.g. from a hand-edited URL) selectable.
  const pageSizes: number[] = PAGE_SIZE_OPTIONS.some(
    (size) => size === pageSize,
  )
    ? [...PAGE_SIZE_OPTIONS]
    : [...PAGE_SIZE_OPTIONS, pageSize].sort((a, b) => a - b)

  function handlePageSizeChange(value: string) {
    // A new page size starts again at page 1.
    onPaginationChange({ page: 1, pageSize: Number(value) })
  }

  return (
    <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Screen readers get this text from the table's status region. */}
      <p className="text-muted-foreground" aria-hidden="true">
        {describePageRange(pagination)}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span id={labelId}>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger aria-labelledby={labelId} className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span>
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() =>
              onPaginationChange({
                // From past the end, go straight to the last page.
                page: Math.min(page - 1, pageCount),
                pageSize,
              })
            }
          >
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPaginationChange({ page: page + 1, pageSize })}
          >
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
