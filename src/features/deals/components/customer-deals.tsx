import { HandshakeIcon, PlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { GenericTable } from '@/components/generic-table'
import { Button } from '@/components/ui/button'
import { customerDealColumns } from '@/features/deals/components/customer-deal-columns'
import { DealFormDialog } from '@/features/deals/components/deal-form-dialog'
import { DeleteDealDialog } from '@/features/deals/components/delete-deal-dialog'
import { useCustomerDeals } from '@/features/deals/hooks/use-deals'
import type { Deal } from '@/features/deals/types/deal'
import { isAppError } from '@/lib/app-error'

const NO_DEALS: Deal[] = []

interface CustomerDealsProps {
  customerId: string
  customerName: string
  /** True for an archived customer: deals are shown but cannot change. */
  isReadOnly: boolean
}

/** The Deals section of a customer's details page. */
export function CustomerDeals({
  customerId,
  customerName,
  isReadOnly,
}: CustomerDealsProps) {
  const headingId = useId()
  const deals = useCustomerDeals(customerId)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Deal | undefined>()
  const [deleting, setDeleting] = useState<Deal | null>(null)

  function openAddDialog() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEditDialog(deal: Deal) {
    setEditing(deal)
    setFormOpen(true)
  }

  const errorMessage =
    deals.isError && !deals.data
      ? isAppError(deals.error)
        ? deals.error.message
        : 'Could not load deals.'
      : undefined

  const addButton = isReadOnly ? undefined : (
    <Button onClick={openAddDialog}>
      <PlusIcon aria-hidden="true" />
      Add deal
    </Button>
  )

  return (
    <section aria-labelledby={headingId} className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold">
          Deals
        </h2>
        {addButton}
      </div>
      <GenericTable
        columns={customerDealColumns}
        // Read-only follows the customer as this page shows it, so Edit and
        // Delete disappear the moment the customer is archived.
        meta={
          isReadOnly
            ? undefined
            : { onEditRow: openEditDialog, onDeleteRow: setDeleting }
        }
        data={deals.data ?? NO_DEALS}
        getRowId={(deal) => deal.id}
        caption="Deals"
        searchLabel="Search deals"
        isLoading={deals.isPending}
        errorMessage={errorMessage}
        onRetry={() => void deals.refetch()}
        emptyState={
          <EmptyState
            icon={HandshakeIcon}
            title="No deals yet"
            description={
              isReadOnly
                ? `${customerName} has no deals.`
                : `Add a deal with ${customerName}.`
            }
            action={addButton}
          />
        }
      />
      {!isReadOnly && (
        <>
          <DealFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            deal={editing}
            customer={{ id: customerId, name: customerName }}
          />
          <DeleteDealDialog
            deal={deleting}
            onOpenChange={(open) => {
              if (!open) setDeleting(null)
            }}
          />
        </>
      )}
    </section>
  )
}
