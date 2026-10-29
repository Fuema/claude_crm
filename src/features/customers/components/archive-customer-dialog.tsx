import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  isCustomerGone,
  useArchiveCustomer,
} from '@/features/customers/hooks/use-customers'
import type { Customer } from '@/features/customers/types/customer'

interface ArchiveCustomerDialogProps {
  /** The customer to archive; `null` keeps the dialog closed. */
  customer: Customer | null
  onOpenChange: (open: boolean) => void
  /** Called after the customer was archived, or turned out to be gone. */
  onArchived?: (customer: Customer) => void
}

export function ArchiveCustomerDialog({
  customer,
  onOpenChange,
  onArchived,
}: ArchiveCustomerDialogProps) {
  const archiveCustomer = useArchiveCustomer()
  // Keep the last name on screen while the dialog animates closed.
  const [shown, setShown] = useState(customer)
  if (customer && customer !== shown) {
    setShown(customer)
  }

  function handleConfirm() {
    if (!customer) return
    const target = customer
    function finish() {
      onOpenChange(false)
      onArchived?.(target)
    }
    archiveCustomer.mutate(target, {
      onSuccess: finish,
      onError: (error) => {
        if (isCustomerGone(error)) finish()
      },
    })
  }

  return (
    <ConfirmDialog
      open={customer !== null}
      onOpenChange={onOpenChange}
      title="Archive customer?"
      description={`${shown?.name ?? 'This customer'} will be hidden from the active customer list and cannot be edited until it is restored.`}
      confirmLabel="Archive customer"
      onConfirm={handleConfirm}
      isPending={archiveCustomer.isPending}
    />
  )
}
