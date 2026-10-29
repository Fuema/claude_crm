import type { DataTablePaginationState } from '@/components/data-table/types'

export interface PageRange {
  pageCount: number
  /** 1-based index of the first row on this page; 0 when there is none. */
  firstRow: number
  lastRow: number
  /** True when `page` is past the last page (e.g. after deleting its last row). */
  isPastEnd: boolean
}

export function getPageRange({
  page,
  pageSize,
  total,
}: DataTablePaginationState): PageRange {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const isPastEnd = total > 0 && page > pageCount
  if (total === 0 || isPastEnd) {
    return { pageCount, firstRow: 0, lastRow: 0, isPastEnd }
  }
  return {
    pageCount,
    firstRow: (page - 1) * pageSize + 1,
    lastRow: Math.min(page * pageSize, total),
    isPastEnd,
  }
}

/** The result summary, e.g. "Showing 1–10 of 42" or "No results". */
export function describePageRange(
  pagination: DataTablePaginationState,
): string {
  if (pagination.total === 0) {
    return 'No results'
  }
  const { firstRow, lastRow } = getPageRange(pagination)
  return firstRow === 0
    ? `Showing 0 of ${pagination.total}`
    : `Showing ${firstRow}–${lastRow} of ${pagination.total}`
}
