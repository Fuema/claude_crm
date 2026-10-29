export type SortDirection = 'asc' | 'desc' | false

/** The `aria-sort` value of a sortable column header. */
export function toAriaSort(
  direction: SortDirection,
): 'ascending' | 'descending' | 'none' {
  if (direction === 'asc') return 'ascending'
  if (direction === 'desc') return 'descending'
  return 'none'
}
