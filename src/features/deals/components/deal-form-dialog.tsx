import { useId } from 'react'
import { FormDialog } from '@/components/form-dialog'
import { DealForm } from '@/features/deals/components/deal-form'
import { useCreateDeal, useUpdateDeal } from '@/features/deals/hooks/use-deals'
import type { Deal } from '@/features/deals/types/deal'
import {
  type DealFormValues,
  EMPTY_DEAL_FORM,
  toDealFormValues,
} from '@/features/deals/types/deal-form-schema'
import type { LookupOption } from '@/types/lookup-option'

interface DealFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The deal to edit; omit to add a new one. */
  deal?: Deal
  /** When adding from a customer's page: the deal is for this customer. */
  customer?: LookupOption
}

/** Add or edit a deal. Closes itself when the save succeeds. */
export function DealFormDialog({
  open,
  onOpenChange,
  deal,
  customer,
}: DealFormDialogProps) {
  const formId = useId()
  const createDeal = useCreateDeal()
  const updateDeal = useUpdateDeal()
  const isEdit = deal !== undefined
  const isPending = createDeal.isPending || updateDeal.isPending

  async function handleSubmit(values: DealFormValues) {
    if (isEdit) {
      await updateDeal.mutateAsync({ id: deal.id, values })
    } else {
      await createDeal.mutateAsync(values)
    }
    onOpenChange(false)
  }

  const fixedCustomer = deal
    ? { id: deal.customer.id, name: deal.customer.name }
    : customer

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit deal' : 'Add deal'}
      description={
        isEdit
          ? `Update the details of ${deal.title}.`
          : customer
            ? `Add a deal with ${customer.name}.`
            : 'Enter the new deal’s details.'
      }
      formId={formId}
      submitLabel={isEdit ? 'Save changes' : 'Add deal'}
      isPending={isPending}
      className="sm:max-w-xl"
    >
      {/* Remount per deal so the form starts from fresh values. */}
      <DealForm
        key={deal?.id ?? 'new'}
        id={formId}
        defaultValues={
          deal
            ? toDealFormValues(deal)
            : { ...EMPTY_DEAL_FORM, customerId: customer?.id ?? '' }
        }
        fixedCustomer={fixedCustomer}
        onSubmit={handleSubmit}
      />
    </FormDialog>
  )
}
