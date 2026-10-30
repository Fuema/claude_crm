import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { isDealGone, useDeleteDeal } from '@/features/deals/hooks/use-deals'
import type { Deal } from '@/features/deals/types/deal'

interface DeleteDealDialogProps {
  /** The deal to delete; `null` keeps the dialog closed. */
  deal: Deal | null
  onOpenChange: (open: boolean) => void
  /** Called after the deal was deleted, or turned out to be gone already. */
  onDeleted?: (deal: Deal) => void
}

export function DeleteDealDialog({
  deal,
  onOpenChange,
  onDeleted,
}: DeleteDealDialogProps) {
  const deleteDeal = useDeleteDeal()
  // Keep the last title on screen while the dialog animates closed.
  const [shown, setShown] = useState(deal)
  if (deal && deal !== shown) {
    setShown(deal)
  }

  function handleConfirm() {
    if (!deal) return
    const target = deal
    function finish() {
      onOpenChange(false)
      onDeleted?.(target)
    }
    deleteDeal.mutate(target, {
      onSuccess: finish,
      onError: (error) => {
        if (isDealGone(error)) finish()
      },
    })
  }

  return (
    <ConfirmDialog
      open={deal !== null}
      onOpenChange={onOpenChange}
      title="Delete deal?"
      description={`This will permanently delete ${shown?.title ?? 'this deal'}.`}
      confirmLabel="Delete deal"
      onConfirm={handleConfirm}
      isPending={deleteDeal.isPending}
      variant="destructive"
    />
  )
}
