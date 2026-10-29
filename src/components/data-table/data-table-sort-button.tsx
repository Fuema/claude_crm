import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SortDirection } from '@/components/data-table/sort-direction'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DataTableSortButtonProps {
  direction: SortDirection
  onToggle: () => void
  children: ReactNode
}

/** The header button of a sortable column. `aria-sort` sits on the `<th>`. */
export function DataTableSortButton({
  direction,
  onToggle,
  children,
}: DataTableSortButtonProps) {
  const Icon =
    direction === 'asc'
      ? ArrowUpIcon
      : direction === 'desc'
        ? ArrowDownIcon
        : ArrowUpDownIcon

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 font-medium"
      onClick={onToggle}
    >
      {children}
      <Icon
        aria-hidden="true"
        className={cn(!direction && 'text-muted-foreground')}
      />
    </Button>
  )
}
