import { MoreHorizontalIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Contact } from '@/features/contacts/types/contact'

interface ContactRowActionsProps {
  contact: Contact
  onEdit: (contact: Contact) => void
  onDelete: (contact: Contact) => void
}

export function ContactRowActions({
  contact,
  onEdit,
  onDelete,
}: ContactRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${contact.fullName}`}
        >
          <MoreHorizontalIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(contact)}>
          <PencilIcon aria-hidden="true" />
          Edit contact
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onDelete(contact)}
        >
          <TrashIcon aria-hidden="true" />
          Delete contact
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
