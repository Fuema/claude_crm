import { z } from 'zod'
import {
  currencySchema,
  DEFAULT_CURRENCY,
  type Deal,
  dealStageSchema,
} from '@/features/deals/types/deal'

/**
 * Up to 9 digits (so at most 999,999,999.99, see docs/project.md) with an
 * optional "." or "," and at most 2 decimals, e.g. "12500" or "99.95".
 */
const AMOUNT_PATTERN = /^\d{1,9}([.,]\d{1,2})?$/

/** The largest value a deal can have (docs/project.md, Section 4). */
export const MAX_DEAL_VALUE = 999_999_999.99

export const AMOUNT_ERROR =
  'Enter an amount up to 999999999.99, digits only, with at most 2 decimals'

/**
 * Create and edit form. Rules come from docs/project.md (Sections 4 and 6).
 * The value is typed as text and sent as a number; an empty contact or
 * close date is sent as null.
 */
export const dealFormSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title'),
  customerId: z.string().min(1, 'Choose a customer'),
  contactId: z.string(),
  value: z.string().trim().regex(AMOUNT_PATTERN, AMOUNT_ERROR),
  currency: currencySchema,
  stage: dealStageSchema,
  expectedCloseDate: z
    .string()
    .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: 'Enter a valid date',
    }),
})

export type DealFormValues = z.infer<typeof dealFormSchema>

export const EMPTY_DEAL_FORM: DealFormValues = {
  title: '',
  customerId: '',
  contactId: '',
  value: '',
  currency: DEFAULT_CURRENCY,
  stage: 'lead',
  expectedCloseDate: '',
}

/** The amount the form's text stands for; the schema has already checked it. */
export function parseAmount(value: string): number {
  return Number(value.replace(',', '.'))
}

/** The form's values for editing an existing deal. */
export function toDealFormValues(deal: Deal): DealFormValues {
  return {
    title: deal.title,
    customerId: deal.customer.id,
    contactId: deal.contact?.id ?? '',
    // Cents always show two digits: 2500.5 is edited as "2500.50".
    value: Number.isInteger(deal.value)
      ? String(deal.value)
      : deal.value.toFixed(2),
    currency: deal.currency,
    stage: deal.stage,
    expectedCloseDate: deal.expectedCloseDate ?? '',
  }
}
