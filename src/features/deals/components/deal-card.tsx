import { Link } from '@tanstack/react-router'
import { ChevronDownIcon } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChangeDealStage } from '@/features/deals/hooks/use-deals'
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type Deal,
} from '@/features/deals/types/deal'
import { formatDate, formatMoney } from '@/lib/format'

interface DealCardProps {
  deal: Deal
}

/**
 * One deal on the pipeline board. "Move to…" changes its stage; an archived
 * customer's deal is read-only and has no menu.
 */
export function DealCard({ deal }: DealCardProps) {
  const titleId = useId()
  const changeStage = useChangeDealStage()
  const { customer } = deal

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground"
    >
      <h3 id={titleId} className="font-medium">
        <Link
          to="/deals/$dealId"
          params={{ dealId: deal.id }}
          className="underline-offset-4 hover:underline"
        >
          {deal.title}
        </Link>
      </h3>
      <p className="text-sm text-muted-foreground">
        {customer.name}
        {customer.isArchived && ' (archived)'}
      </p>
      <p className="text-sm">
        {formatMoney(deal.value, deal.currency)}
        {deal.expectedCloseDate && (
          <span className="text-muted-foreground">
            {' · '}closes {formatDate(deal.expectedCloseDate)}
          </span>
        )}
      </p>
      {!customer.isArchived && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              // Names the deal too; the visible text alone repeats on every card.
              aria-describedby={titleId}
              disabled={changeStage.isPending}
            >
              Move to…
              <ChevronDownIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Move {deal.title} to</DropdownMenuLabel>
            {DEAL_STAGES.filter((stage) => stage !== deal.stage).map(
              (stage) => (
                <DropdownMenuItem
                  key={stage}
                  onSelect={() => changeStage.mutate({ deal, stage })}
                >
                  {DEAL_STAGE_LABELS[stage]}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </article>
  )
}
