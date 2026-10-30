import { useId, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { FormDialog } from '@/components/form-dialog'
import { ActivityForm } from '@/features/activities/components/activity-form'
import {
  useCreateActivity,
  useDeleteActivity,
  useUpdateActivity,
} from '@/features/activities/hooks/use-activities'
import type {
  Activity,
  ActivityScope,
} from '@/features/activities/types/activity'
import {
  type ActivityFormValues,
  newActivityFormValues,
  toActivityFormValues,
} from '@/features/activities/types/activity-form-schema'
import { isAppError } from '@/lib/app-error'
import { todayIsoDate } from '@/lib/format'
import type { LookupOption } from '@/types/lookup-option'

interface ActivityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The activity to edit; omit to log a new one. */
  activity?: Activity
  /** For a new activity: the customer (and deal) it is logged against. */
  scope?: ActivityScope
  /** The customer, when it is fixed (logging from its page). */
  customer?: LookupOption
}

/** Log or edit an activity. Closes itself when the save succeeds. */
export function ActivityFormDialog({
  open,
  onOpenChange,
  activity,
  scope,
  customer,
}: ActivityFormDialogProps) {
  const formId = useId()
  const createActivity = useCreateActivity()
  const updateActivity = useUpdateActivity()
  const isEdit = activity !== undefined
  const fixedCustomer = activity
    ? { id: activity.customer.id, name: activity.customer.name }
    : customer

  async function handleSubmit(values: ActivityFormValues) {
    if (activity) {
      await updateActivity.mutateAsync({ id: activity.id, values })
    } else {
      await createActivity.mutateAsync(values)
    }
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit activity' : 'Log activity'}
      description={
        isEdit
          ? `Update ${activity.subject}.`
          : 'A call, meeting, email, or task for a customer.'
      }
      formId={formId}
      submitLabel={isEdit ? 'Save changes' : 'Log activity'}
      isPending={createActivity.isPending || updateActivity.isPending}
      className="sm:max-w-xl"
    >
      {/* Remount per activity (and per opening) so the form starts fresh. */}
      {open && (
        <ActivityForm
          key={activity?.id ?? 'new'}
          id={formId}
          defaultValues={
            activity
              ? toActivityFormValues(activity)
              : newActivityFormValues(todayIsoDate(), {
                  customerId: scope?.customerId ?? customer?.id,
                  dealId: scope?.dealId,
                })
          }
          fixedCustomer={fixedCustomer}
          onSubmit={handleSubmit}
        />
      )}
    </FormDialog>
  )
}

interface DeleteActivityDialogProps {
  /** The activity to delete; `null` keeps the dialog closed. */
  activity: Activity | null
  onOpenChange: (open: boolean) => void
}

/** Rule 26: deleting is permanent, after a confirmation that names it. */
export function DeleteActivityDialog({
  activity,
  onOpenChange,
}: DeleteActivityDialogProps) {
  const deleteActivity = useDeleteActivity()
  // Keep the subject on screen while the dialog animates closed.
  const [shown, setShown] = useState(activity)
  if (activity && activity !== shown) {
    setShown(activity)
  }

  function handleConfirm() {
    if (!activity) return
    deleteActivity.mutate(activity, {
      onSuccess: () => onOpenChange(false),
      onError: (error) => {
        if (isAppError(error) && error.code === 'NOT_FOUND') {
          onOpenChange(false)
        }
      },
    })
  }

  return (
    <ConfirmDialog
      open={activity !== null}
      onOpenChange={onOpenChange}
      title="Delete activity?"
      description={`This will permanently delete ${shown?.subject ?? 'this activity'}.`}
      confirmLabel="Delete activity"
      onConfirm={handleConfirm}
      isPending={deleteActivity.isPending}
      variant="destructive"
    />
  )
}
