import type { UseQueryResult } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { HandshakeIcon } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DealBoardColumn } from '@/features/deals/components/deal-board-column'
import { DealCustomerFilter } from '@/features/deals/components/deal-customer-filter'
import { useBoardDeals } from '@/features/deals/hooks/use-deals'
import { DEAL_STAGES, type Deal } from '@/features/deals/types/deal'
import { groupDealsByStage } from '@/features/deals/types/deal-board'
import { isAppError } from '@/lib/app-error'

const routeApi = getRouteApi('/_authenticated/deals/board')

/**
 * Every deal in a column per stage. Columns stack on phones and sit side by
 * side, scrolling sideways, from the `md` breakpoint.
 */
export function DealBoardPage() {
  const { customer } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const deals = useBoardDeals(customer)

  function setCustomer(next: string | undefined) {
    void navigate({ search: { customer: next } })
  }

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Every deal by stage. Totals are per currency and never converted."
      />
      <div className="mb-4">
        <DealCustomerFilter customerId={customer} onChange={setCustomer} />
      </div>
      <BoardContent
        deals={deals}
        onRetry={() => void deals.refetch()}
        hasFilter={customer !== undefined}
        onShowAllCustomers={() => setCustomer(undefined)}
      />
    </>
  )
}

interface BoardContentProps {
  deals: UseQueryResult<Deal[]>
  onRetry: () => void
  hasFilter: boolean
  onShowAllCustomers: () => void
}

function BoardContent({
  deals,
  onRetry,
  hasFilter,
  onShowAllCustomers,
}: BoardContentProps) {
  if (deals.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3 md:flex-row">
        <p className="sr-only" role="status">
          Loading deals
        </p>
        {DEAL_STAGES.map((stage) => (
          <Skeleton key={stage} className="h-40 md:w-72 md:shrink-0" />
        ))}
      </div>
    )
  }

  if (deals.isError) {
    return (
      <ErrorState
        message={
          isAppError(deals.error)
            ? deals.error.message
            : 'Could not load deals.'
        }
        onRetry={onRetry}
      />
    )
  }

  if (deals.data.length === 0) {
    return (
      <EmptyState
        icon={HandshakeIcon}
        title={hasFilter ? 'No deals for this customer' : 'No deals yet'}
        description={
          hasFilter
            ? 'Choose another customer, or show every customer’s deals.'
            : 'Add a deal from the deal list to see it here.'
        }
        action={
          hasFilter ? (
            <Button variant="outline" onClick={onShowAllCustomers}>
              Show all customers
            </Button>
          ) : (
            <Button asChild>
              <Link to="/deals">Go to all deals</Link>
            </Button>
          )
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:overflow-x-auto md:pb-2">
      {groupDealsByStage(deals.data).map((column) => (
        <DealBoardColumn key={column.stage} column={column} />
      ))}
    </div>
  )
}
