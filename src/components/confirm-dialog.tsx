import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Names the record, e.g. "This will permanently delete Jane Doe." */
  description: ReactNode
  /** Names the action, e.g. "Delete employee". */
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  /** While true, the dialog stays open and cannot be dismissed. */
  isPending?: boolean
  variant?: 'default' | 'destructive'
}

/**
 * Asks before an action. It does not close itself on confirm: the caller
 * closes it (onOpenChange(false)) when the action succeeds.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  isPending = false,
  variant = 'default',
}: ConfirmDialogProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (!isPending) {
      onOpenChange(nextOpen)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>
          {/* A plain Button, not AlertDialogAction, so the dialog stays open
              until the action finishes. */}
          <Button variant={variant} disabled={isPending} onClick={onConfirm}>
            {isPending && (
              // biome-ignore lint/a11y/useValidAriaRole: drops the Spinner's role="status"; the button label already names the action.
              <Spinner aria-hidden="true" role={undefined} />
            )}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
