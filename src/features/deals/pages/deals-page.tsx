import { HandshakeIcon, PlusIcon, SearchXIcon } from 'lucide-react'
import { useState } from 'react'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { dealColumns } from '@/features/deals/components/deal-columns'
import { DealFilters } from '@/features/deals/components/deal-filters'
import { DealFormDialog } from '@/features/deals/components/deal-form-dialog'
import { DeleteDealDialog } from '@/features/deals/components/delete-deal-dialog'
import { useDealListSearch } from '@/features/deals/hooks/use-deal-list-search'
import { useDeals } from '@/features/deals/hooks/use-deals'
import type { Deal } from '@/features/deals/types/deal'
import { isAppError } from '@/lib/app-error'

const NO_DEALS: Deal[] = []

export function DealsPage() {
  const list = useDealListSearch()
  const deals = useDeals(list.params)
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

  function handleDeleted() {
    // Deleting the only row on a later page: show the previous page.
    const rowsOnPage = deals.data?.items.length ?? 0
    if (rowsOnPage === 1 && list.params.page > 1) {
      list.setPage({
        page: list.params.page - 1,
        pageSize: list.params.pageSize,
      })
    }
  }

  const errorMessage =
    deals.isError && !deals.data
      ? isAppError(deals.error)
        ? deals.error.message
        : 'Could not load deals.'
      : undefined

  const addButton = (
    <Button onClick={openAddDialog}>
      <PlusIcon aria-hidden="true" />
      Add deal
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Deals"
        description="Every potential sale, at every stage."
        actions={addButton}
      />
      <DataTable
        columns={dealColumns}
        meta={{ onEditRow: openEditDialog, onDeleteRow: setDeleting }}
        data={deals.data?.items ?? NO_DEALS}
        getRowId={(deal) => deal.id}
        caption="Deals"
        pagination={{ ...list.params, total: deals.data?.total ?? 0 }}
        onPaginationChange={list.setPage}
        sorting={list.sorting}
        onSortingChange={list.setSorting}
        search={{
          value: list.params.q,
          onChange: list.setSearchText,
          label: 'Search deals',
        }}
        toolbar={
          <DealFilters
            stage={list.params.stage}
            customerId={list.params.customerId}
            onStageChange={list.setStage}
            onCustomerChange={list.setCustomer}
          />
        }
        isLoading={deals.isPending}
        errorMessage={errorMessage}
        onRetry={() => void deals.refetch()}
        emptyState={
          list.hasFilters ? (
            <EmptyState
              icon={SearchXIcon}
              title="No deals match your search"
              description="Try a different search, or clear the filters."
              action={
                <Button variant="outline" onClick={list.clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={HandshakeIcon}
              title="No deals yet"
              description="Add your first deal to get started."
              action={addButton}
            />
          )
        }
      />
      <DealFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        deal={editing}
      />
      <DeleteDealDialog
        deal={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onDeleted={handleDeleted}
      />
    </>
  )
}
