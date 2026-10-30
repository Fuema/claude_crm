import { z } from 'zod'
import type { Currency } from '@/lib/currency'

export const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'void'])

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>

export const INVOICE_STATUSES = invoiceStatusSchema.options

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  void: 'Void',
}

export interface InvoiceLine {
  id: string
  description: string
  /** Decimal strings, e.g. "1.50" and "1200.00". */
  quantity: string
  unitPrice: string
  /** quantity × unit price, rounded to cents. */
  amount: string
}

/** All amounts are decimal strings in `currency`, never floats. */
export interface Invoice {
  id: string
  /** "INV-0001" once sent (rule 29); null for drafts. */
  number: string | null
  status: InvoiceStatus
  customer: {
    id: string
    name: string
    /** An archived customer's drafts are read-only (rule 32). */
    isArchived: boolean
  }
  deal: { id: string; title: string } | null
  currency: Currency
  /** Percent, e.g. "19.00". */
  taxRate: string
  /** Calendar dates "YYYY-MM-DD". */
  dueDate: string | null
  issuedAt: string | null
  notes: string | null
  lines: InvoiceLine[]
  subtotal: string
  tax: string
  total: string
}

export interface InvoicePage {
  items: Invoice[]
  total: number
  page: number
  pageSize: number
}

/** How a draft is named before it has a number. */
export function invoiceLabel(invoice: Pick<Invoice, 'number'>): string {
  return invoice.number ?? 'Draft invoice'
}
