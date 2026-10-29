import { Link } from '@tanstack/react-router'
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Customer } from '@/features/customers/types/customer'

interface CustomerRowActionsProps {
  customer: Customer
  /** Omit to hide "Edit customer". Never shown for an archived customer. */
  onEdit?: (customer: Customer) => void
  /** Omit to hide "Archive customer". */
  onArchive?: (customer: Customer) => void
  /** Omit to hide "Restore customer". */
  onRestore?: (customer: Customer) => void
}

export function CustomerRowActions({
  customer,
  onEdit,
  onArchive,
  onRestore,
}: CustomerRowActionsProps) {
  const isArchived = customer.status === 'archived'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${customer.name}`}
        >
          <MoreHorizontalIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link
            to="/customers/$customerId"
            params={{ customerId: customer.id }}
          >
            <EyeIcon aria-hidden="true" />
            View details
          </Link>
        </DropdownMenuItem>
        {onEdit && !isArchived && (
          <DropdownMenuItem onSelect={() => onEdit(customer)}>
            <PencilIcon aria-hidden="true" />
            Edit customer
          </DropdownMenuItem>
        )}
        {onArchive && !isArchived && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onArchive(customer)}>
              <ArchiveIcon aria-hidden="true" />
              Archive customer
            </DropdownMenuItem>
          </>
        )}
        {onRestore && isArchived && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onRestore(customer)}>
              <ArchiveRestoreIcon aria-hidden="true" />
              Restore customer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
