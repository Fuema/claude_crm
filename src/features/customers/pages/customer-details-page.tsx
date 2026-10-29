import { getRouteApi, Link } from '@tanstack/react-router'
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  BuildingIcon,
  PencilIcon,
} from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArchiveCustomerDialog } from '@/features/customers/components/archive-customer-dialog'
import { CustomerDetails } from '@/features/customers/components/customer-details'
import { CustomerFormDialog } from '@/features/customers/components/customer-form-dialog'
import {
  isCustomerGone,
  useCustomer,
  useRestoreCustomer,
} from '@/features/customers/hooks/use-customers'
import { isAppError } from '@/lib/app-error'

const routeApi = getRouteApi('/_authenticated/customers/$customerId')

export function CustomerDetailsPage() {
  const { customerId } = routeApi.useParams()
  const customer = useCustomer(customerId)
  const restoreCustomer = useRestoreCustomer()
  const [isEditing, setIsEditing] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const backLink = (
    <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
      <Link to="/customers">
        <ArrowLeftIcon aria-hidden="true" />
        Back to customers
      </Link>
    </Button>
  )

  if (customer.isPending) {
    return (
      <div aria-busy="true">
        {backLink}
        <p className="sr-only" role="status">
          Loading customer
        </p>
        <Skeleton className="mb-6 h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (customer.isError) {
    const isNotFound = isCustomerGone(customer.error)
    return (
      <div>
        {backLink}
        {isNotFound ? (
          <EmptyState
            icon={BuildingIcon}
            title="Customer not found"
            description="This customer does not exist."
          />
        ) : (
          <ErrorState
            message={
              isAppError(customer.error)
                ? customer.error.message
                : 'Could not load this customer.'
            }
            onRetry={() => void customer.refetch()}
          />
        )}
      </div>
    )
  }

  const data = customer.data
  const isArchived = data.status === 'archived'
  return (
    <div>
      {backLink}
      <PageHeader
        title={data.name}
        description={
          isArchived
            ? 'Archived. Restore this customer to make changes.'
            : (data.industry ?? undefined)
        }
        actions={
          isArchived ? (
            <Button
              onClick={() => restoreCustomer.mutate(data)}
              disabled={restoreCustomer.isPending}
            >
              <ArchiveRestoreIcon aria-hidden="true" />
              Restore customer
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <PencilIcon aria-hidden="true" />
                Edit customer
              </Button>
              <Button variant="outline" onClick={() => setIsArchiving(true)}>
                <ArchiveIcon aria-hidden="true" />
                Archive customer
              </Button>
            </>
          )
        }
      />
      <CustomerDetails customer={data} />
      {/* Contacts and Deals sections join here with their features. */}
      {!isArchived && (
        <CustomerFormDialog
          open={isEditing}
          onOpenChange={setIsEditing}
          customer={data}
        />
      )}
      <ArchiveCustomerDialog
        customer={isArchiving ? data : null}
        onOpenChange={setIsArchiving}
      />
    </div>
  )
}
