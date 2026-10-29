import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  /**
   * The `id` of the form passed as children. The submit button sits in the
   * footer, outside the form, and submits it through `form={formId}`.
   */
  formId: string
  /** e.g. "Save changes", "Add employee". */
  submitLabel: string
  cancelLabel?: string
  /** While true, submit is disabled and the dialog cannot be dismissed. */
  isPending?: boolean
  /** The feature's form, rendered with `id={formId}`. */
  children: ReactNode
  /** For the dialog panel, e.g. `sm:max-w-lg` for a wider form. */
  className?: string
}

/**
 * A dialog shell for a form. The feature owns the form (react-hook-form,
 * Zod schema, submit handler) and closes the dialog when the save succeeds.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  formId,
  submitLabel,
  cancelLabel = 'Cancel',
  isPending = false,
  children,
  className,
}: FormDialogProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (!isPending) {
      onOpenChange(nextOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isPending}
        className={className}
        // Without a description, tell Radix there is none to point to.
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {/* Long forms scroll inside the dialog instead of running off small
            screens; padding keeps focus rings visible. */}
        <div className="-m-1 max-h-[60svh] overflow-y-auto p-1">{children}</div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            {isPending && (
              // biome-ignore lint/a11y/useValidAriaRole: drops the Spinner's role="status"; the button label already names the action.
              <Spinner aria-hidden="true" role={undefined} />
            )}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
