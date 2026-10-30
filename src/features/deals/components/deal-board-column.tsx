import { useId } from 'react'
import { DealCard } from '@/features/deals/components/deal-card'
import { DEAL_STAGE_LABELS } from '@/features/deals/types/deal'
import type { StageColumn } from '@/features/deals/types/deal-board'
import { formatMoney } from '@/lib/format'

interface DealBoardColumnProps {
  column: StageColumn
}

/** One stage: its name, deal count, a total per currency, and its cards. */
export function DealBoardColumn({ column }: DealBoardColumnProps) {
  const headingId = useId()
  const count = column.deals.length
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3 md:w-72 md:shrink-0"
    >
      <header className="flex flex-col gap-0.5">
        <h2 id={headingId} className="font-semibold">
          {DEAL_STAGE_LABELS[column.stage]}
        </h2>
        <p className="text-sm text-muted-foreground">
          {count === 1 ? '1 deal' : `${count} deals`}
          {column.totals.map((total) => (
            <span key={total.currency}>
              {' · '}
              {formatMoney(total.value, total.currency)}
            </span>
          ))}
        </p>
      </header>
      {count === 0 ? (
        <p className="text-sm text-muted-foreground">No deals at this stage.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {column.deals.map((deal) => (
            <li key={deal.id}>
              <DealCard deal={deal} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
