import { z } from 'zod'

/** The currencies deals and invoices use; amounts are never converted. */
export const currencySchema = z.enum(['EUR', 'USD', 'GBP'])

export type Currency = z.infer<typeof currencySchema>

export const DEFAULT_CURRENCY: Currency = 'EUR'
