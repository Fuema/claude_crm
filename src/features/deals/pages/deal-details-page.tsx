import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  HandshakeIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ActivitiesSection } from '@/features/activities'
import { DealDetails } from '@/features/deals/components/deal-details'
import { DealFormDialog } from '@/features/deals/components/deal-form-dialog'
import { DealStageControl } from '@/features/deals/components/deal-stage-control'
import { DeleteDealDialog } from '@/features/deals/components/delete-deal-dialog'
import { isDealGone, useDeal } from '@/features/deals/hooks/use-deals'
import { isAppError } from '@/lib/app-error'

const routeApi = getRouteApi('/_authenticated/deals/$dealId')

export function DealDetailsPage() {
  const { dealId } = routeApi.useParams()
  const deal = useDeal(dealId)
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const backLink = (
    <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
      <Link to="/deals">
        <ArrowLeftIcon aria-hidden="true" />
        Back to deals
      </Link>
    </Button>
  )

  if (deal.isPending) {
    return (
      <div aria-busy="true">
        {backLink}
        <p className="sr-only" role="status">
          Loading deal
        </p>
        <Skeleton className="mb-6 h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (deal.isError) {
    const isNotFound = isDealGone(deal.error)
    return (
      <div>
        {backLink}
        {isNotFound ? (
          <EmptyState
            icon={HandshakeIcon}
            title="Deal not found"
            description="This deal does not exist or was deleted."
          />
        ) : (
          <ErrorState
            message={
              isAppError(deal.error)
                ? deal.error.message
                : 'Could not load this deal.'
            }
            onRetry={() => void deal.refetch()}
          />
        )}
      </div>
    )
  }

  const data = deal.data
  const isReadOnly = data.customer.isArchived
  return (
    <div>
      {backLink}
      <PageHeader
        title={data.title}
        description={
          isReadOnly
            ? `${data.customer.name} is archived. Restore the customer to change this deal.`
            : data.customer.name
        }
        actions={
          isReadOnly ? undefined : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <PencilIcon aria-hidden="true" />
                Edit deal
              </Button>
              <Button variant="destructive" onClick={() => setIsDeleting(true)}>
                <TrashIcon aria-hidden="true" />
                Delete deal
              </Button>
            </>
          )
        }
      />
      {!isReadOnly && (
        <div className="mb-6">
          <DealStageControl deal={data} />
        </div>
      )}
      <DealDetails deal={data} showStage={isReadOnly} />
      <ActivitiesSection
        scope={{ customerId: data.customer.id, dealId: data.id }}
        customer={{ id: data.customer.id, name: data.customer.name }}
        isReadOnly={isReadOnly}
      />
      {!isReadOnly && (
        <>
          <DealFormDialog
            open={isEditing}
            onOpenChange={setIsEditing}
            deal={data}
          />
          <DeleteDealDialog
            deal={isDeleting ? data : null}
            onOpenChange={setIsDeleting}
            onDeleted={() => void navigate({ to: '/deals' })}
          />
        </>
      )}
    </div>
  )
}
