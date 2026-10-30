import { z } from 'zod'
import type { Currency } from '@/lib/currency'

export const dealStageSchema = z.enum([
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
])

export type DealStage = z.infer<typeof dealStageSchema>

/** In pipeline order. */
export const DEAL_STAGES = dealStageSchema.options

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

export {
  type Currency,
  currencySchema,
  DEFAULT_CURRENCY,
} from '@/lib/currency'

export interface DealCustomer {
  id: string
  name: string
  /** An archived customer's deals are read-only. */
  isArchived: boolean
}

export interface DealContact {
  id: string
  name: string
}

export interface Deal {
  id: string
  title: string
  customer: DealCustomer
  contact: DealContact | null
  /** In `currency`; never converted or added to another currency. */
  value: number
  currency: Currency
  stage: DealStage
  /** Calendar date, "YYYY-MM-DD". */
  expectedCloseDate: string | null
}

export interface DealPage {
  items: Deal[]
  total: number
  page: number
  pageSize: number
}
