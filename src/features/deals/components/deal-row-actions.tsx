import { Link } from '@tanstack/react-router'
import {
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Deal } from '@/features/deals/types/deal'

interface DealRowActionsProps {
  deal: Deal
  /** Omit to hide "Edit deal". Never shown for an archived customer's deal. */
  onEdit?: (deal: Deal) => void
  /** Omit to hide "Delete deal". Never shown for an archived customer's deal. */
  onDelete?: (deal: Deal) => void
}

export function DealRowActions({
  deal,
  onEdit,
  onDelete,
}: DealRowActionsProps) {
  const canChange = !deal.customer.isArchived
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${deal.title}`}
        >
          <MoreHorizontalIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/deals/$dealId" params={{ dealId: deal.id }}>
            <EyeIcon aria-hidden="true" />
            View details
          </Link>
        </DropdownMenuItem>
        {onEdit && canChange && (
          <DropdownMenuItem onSelect={() => onEdit(deal)}>
            <PencilIcon aria-hidden="true" />
            Edit deal
          </DropdownMenuItem>
        )}
        {onDelete && canChange && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete(deal)}
            >
              <TrashIcon aria-hidden="true" />
              Delete deal
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
