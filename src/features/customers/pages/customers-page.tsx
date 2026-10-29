import { BuildingIcon, PlusIcon, SearchXIcon } from 'lucide-react'
import { useState } from 'react'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { ArchiveCustomerDialog } from '@/features/customers/components/archive-customer-dialog'
import { customerColumns } from '@/features/customers/components/customer-columns'
import { CustomerFormDialog } from '@/features/customers/components/customer-form-dialog'
import { CustomerStatusSelect } from '@/features/customers/components/customer-status-select'
import { useCustomerListSearch } from '@/features/customers/hooks/use-customer-list-search'
import {
  useCustomers,
  useRestoreCustomer,
} from '@/features/customers/hooks/use-customers'
import type { Customer } from '@/features/customers/types/customer'
import { isAppError } from '@/lib/app-error'

const NO_CUSTOMERS: Customer[] = []

export function CustomersPage() {
  const list = useCustomerListSearch()
  const customers = useCustomers(list.params)
  const restoreCustomer = useRestoreCustomer()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | undefined>()
  const [archiving, setArchiving] = useState<Customer | null>(null)

  function openAddDialog() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEditDialog(customer: Customer) {
    setEditing(customer)
    setFormOpen(true)
  }

  function goBackIfPageEmptied() {
    // Archiving or restoring moves the row out of a filtered list: when it
    // was the only row on a later page, show the previous page.
    const rowsOnPage = customers.data?.items.length ?? 0
    if (rowsOnPage === 1 && list.params.page > 1) {
      list.setPage({
        page: list.params.page - 1,
        pageSize: list.params.pageSize,
      })
    }
  }

  function handleRestore(customer: Customer) {
    restoreCustomer.mutate(customer, {
      onSuccess: () => {
        if (list.params.status === 'archived') goBackIfPageEmptied()
      },
    })
  }

  function handleArchived() {
    if (list.params.status === 'active') goBackIfPageEmptied()
  }

  const errorMessage =
    customers.isError && !customers.data
      ? isAppError(customers.error)
        ? customers.error.message
        : 'Could not load customers.'
      : undefined

  const addButton = (
    <Button onClick={openAddDialog}>
      <PlusIcon aria-hidden="true" />
      Add customer
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Customers"
        description="The companies you sell to."
        actions={addButton}
      />
      <DataTable
        columns={customerColumns}
        meta={{
          onEditRow: openEditDialog,
          onArchiveRow: setArchiving,
          onRestoreRow: handleRestore,
        }}
        data={customers.data?.items ?? NO_CUSTOMERS}
        getRowId={(customer) => customer.id}
        caption="Customers"
        pagination={{ ...list.params, total: customers.data?.total ?? 0 }}
        onPaginationChange={list.setPage}
        sorting={list.sorting}
        onSortingChange={list.setSorting}
        search={{
          value: list.params.q,
          onChange: list.setSearchText,
          label: 'Search customers',
        }}
        toolbar={
          <CustomerStatusSelect
            value={list.statusFilter}
            onChange={list.setStatusFilter}
          />
        }
        isLoading={customers.isPending}
        errorMessage={errorMessage}
        onRetry={() => void customers.refetch()}
        emptyState={
          list.hasFilters ? (
            <EmptyState
              icon={SearchXIcon}
              title="No customers match your search"
              description="Try a different search, or clear the filters."
              action={
                <Button variant="outline" onClick={list.clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            // The default view hides archived customers, so an empty list
            // does not mean there are no customers at all.
            <EmptyState
              icon={BuildingIcon}
              title="No active customers"
              description="Add a customer, or show archived customers."
              action={
                <>
                  {addButton}
                  <Button
                    variant="outline"
                    onClick={() => list.setStatusFilter('archived')}
                  >
                    Show archived customers
                  </Button>
                </>
              }
            />
          )
        }
      />
      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
      />
      <ArchiveCustomerDialog
        customer={archiving}
        onOpenChange={(open) => !open && setArchiving(null)}
        onArchived={handleArchived}
      />
    </>
  )
}
