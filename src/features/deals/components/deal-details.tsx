import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { DealStageBadge } from '@/features/deals/components/deal-stage-badge'
import type { Deal } from '@/features/deals/types/deal'
import { formatDate, formatMoney } from '@/lib/format'

const NOT_SET = 'Not set'

interface DealDetailsProps {
  deal: Deal
  /** False when the page shows a stage control instead. */
  showStage?: boolean
}

export function DealDetails({ deal, showStage = true }: DealDetailsProps) {
  return (
    <dl className="grid gap-x-6 gap-y-4 rounded-lg border p-4 sm:grid-cols-2">
      <DetailItem term="Customer">
        <Link
          to="/customers/$customerId"
          params={{ customerId: deal.customer.id }}
          className="underline-offset-4 hover:underline"
        >
          {deal.customer.name}
        </Link>
      </DetailItem>
      <DetailItem term="Contact">{deal.contact?.name ?? NOT_SET}</DetailItem>
      <DetailItem term="Value">
        {formatMoney(deal.value, deal.currency)}
      </DetailItem>
      {showStage && (
        <DetailItem term="Stage">
          <DealStageBadge stage={deal.stage} />
        </DetailItem>
      )}
      <DetailItem term="Expected close date">
        {deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : NOT_SET}
      </DetailItem>
    </dl>
  )
}

interface DetailItemProps {
  term: string
  children: ReactNode
}

function DetailItem({ term, children }: DetailItemProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{term}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}
