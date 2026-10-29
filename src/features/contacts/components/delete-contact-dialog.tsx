import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  isContactGone,
  useDeleteContact,
} from '@/features/contacts/hooks/use-contacts'
import type { Contact } from '@/features/contacts/types/contact'

interface DeleteContactDialogProps {
  /** The contact to delete; `null` keeps the dialog closed. */
  contact: Contact | null
  onOpenChange: (open: boolean) => void
}

export function DeleteContactDialog({
  contact,
  onOpenChange,
}: DeleteContactDialogProps) {
  const deleteContact = useDeleteContact()
  // Keep the last name on screen while the dialog animates closed.
  const [shown, setShown] = useState(contact)
  if (contact && contact !== shown) {
    setShown(contact)
  }

  function handleConfirm() {
    if (!contact) return
    deleteContact.mutate(contact, {
      onSuccess: () => onOpenChange(false),
      onError: (error) => {
        if (isContactGone(error)) onOpenChange(false)
      },
    })
  }

  return (
    <ConfirmDialog
      open={contact !== null}
      onOpenChange={onOpenChange}
      title="Delete contact?"
      description={`This will permanently delete ${shown?.fullName ?? 'this contact'}.`}
      confirmLabel="Delete contact"
      onConfirm={handleConfirm}
      isPending={deleteContact.isPending}
      variant="destructive"
    />
  )
}
