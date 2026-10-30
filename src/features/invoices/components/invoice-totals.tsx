import { formatMoney } from '@/lib/format'

interface InvoiceTotalsProps {
  currency: string
  taxRate: string
  subtotal: string
  tax: string
  total: string
}

/** Subtotal, tax, and total, right-aligned under the lines. */
export function InvoiceTotals({
  currency,
  taxRate,
  subtotal,
  tax,
  total,
}: InvoiceTotalsProps) {
  return (
    <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
      <dt className="text-muted-foreground">Subtotal</dt>
      <dd className="text-right tabular-nums">
        {formatMoney(subtotal, currency)}
      </dd>
      <dt className="text-muted-foreground">Tax ({taxRate}%)</dt>
      <dd className="text-right tabular-nums">{formatMoney(tax, currency)}</dd>
      <dt className="border-t pt-1 font-semibold">Total</dt>
      <dd className="border-t pt-1 text-right font-semibold tabular-nums">
        {formatMoney(total, currency)}
      </dd>
    </dl>
  )
}
