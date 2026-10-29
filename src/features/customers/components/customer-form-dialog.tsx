import { useId, useState } from 'react'
import { FormDialog } from '@/components/form-dialog'
import { CustomerForm } from '@/features/customers/components/customer-form'
import {
  useCreateCustomer,
  useUpdateCustomer,
} from '@/features/customers/hooks/use-customers'
import type { Customer } from '@/features/customers/types/customer'
import {
  type CustomerFormValues,
  EMPTY_CUSTOMER_FORM,
  toCustomerFormValues,
} from '@/features/customers/types/customer-form-schema'

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The customer to edit; omit to add a new one. */
  customer?: Customer
}

/** Add or edit a customer. Closes itself when the save succeeds. */
export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: CustomerFormDialogProps) {
  const formId = useId()
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const isEdit = customer !== undefined
  const isPending = createCustomer.isPending || updateCustomer.isPending
  // One key per new customer: a retried submit is not created twice.
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  )

  async function handleSubmit(values: CustomerFormValues) {
    if (isEdit) {
      await updateCustomer.mutateAsync({ id: customer.id, values })
    } else {
      await createCustomer.mutateAsync({ values, idempotencyKey })
      setIdempotencyKey(crypto.randomUUID())
    }
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit customer' : 'Add customer'}
      description={
        isEdit
          ? `Update the details of ${customer.name}.`
          : 'Enter the new customer’s details.'
      }
      formId={formId}
      submitLabel={isEdit ? 'Save changes' : 'Add customer'}
      isPending={isPending}
      className="sm:max-w-xl"
    >
      {/* Remount per customer so the form starts from fresh values. */}
      <CustomerForm
        key={customer?.id ?? 'new'}
        id={formId}
        defaultValues={
          customer ? toCustomerFormValues(customer) : EMPTY_CUSTOMER_FORM
        }
        onSubmit={handleSubmit}
      />
    </FormDialog>
  )
}
