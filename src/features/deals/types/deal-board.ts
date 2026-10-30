import { z } from 'zod'
import {
  type Currency,
  currencySchema,
  DEAL_STAGES,
  type Deal,
  type DealStage,
} from '@/features/deals/types/deal'

/** The board's URL search params; an invalid value falls back to `undefined`. */
export const dealBoardSearchSchema = z.object({
  customer: z.string().min(1).optional().catch(undefined),
})

export type DealBoardSearch = z.infer<typeof dealBoardSearchSchema>

export interface CurrencyTotal {
  currency: Currency
  value: number
}

export interface StageColumn {
  stage: DealStage
  deals: Deal[]
  /** One total per currency used in the column, in currency order; never converted. */
  totals: CurrencyTotal[]
}

/**
 * One column per stage, in pipeline order, each with its deals (in the
 * order given) and a total per currency. Sums are kept in cents so
 * 0.1 + 0.2 adds up to 0.30, not 0.30000000000000004.
 */
export function groupDealsByStage(deals: Deal[]): StageColumn[] {
  return DEAL_STAGES.map((stage) => {
    const inStage = deals.filter((deal) => deal.stage === stage)
    const totals = currencySchema.options.flatMap((currency) => {
      const ofCurrency = inStage.filter((deal) => deal.currency === currency)
      if (ofCurrency.length === 0) return []
      const cents = ofCurrency.reduce(
        (sum, deal) => sum + Math.round(deal.value * 100),
        0,
      )
      return [{ currency, value: cents / 100 }]
    })
    return { stage, deals: inStage, totals }
  })
}
