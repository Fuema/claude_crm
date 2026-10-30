// Invoice arithmetic in whole cents with BigInt, shared by the server (which
// is authoritative) and the form's live preview, so both always agree.
// Amounts travel as decimal strings ("1234.50"): a float cannot hold large
// totals exactly. Rules: docs/project.md, Section 4 (Invoice).

/** Up to 9 digits, an optional "." or "," and at most 2 decimals. */
export const AMOUNT_PATTERN = /^\d{1,9}([.,]\d{1,2})?$/

/** A tax rate from 0 to 100 with at most 2 decimals. */
export const TAX_RATE_PATTERN = /^(100([.,]0{1,2})?|\d{1,2}([.,]\d{1,2})?)$/

/** "12,5" → 1250n. The text must match AMOUNT_PATTERN or TAX_RATE_PATTERN. */
export function toCents(text: string): bigint {
  const [whole = '0', fraction = ''] = text.trim().replace(',', '.').split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2))
}

/** 1250n → "12.50". */
export function formatCents(cents: bigint): string {
  const sign = cents < 0n ? '-' : ''
  const absolute = cents < 0n ? -cents : cents
  const whole = absolute / 100n
  const fraction = (absolute % 100n).toString().padStart(2, '0')
  return `${sign}${whole}.${fraction}`
}

/** Divides a non-negative value and rounds half up (0.005 → 0.01). */
function divideRoundingHalfUp(value: bigint, divisor: bigint): bigint {
  return (value + divisor / 2n) / divisor
}

/** quantity × unit price, rounded to cents. */
export function lineAmountCents(quantity: string, unitPrice: string): bigint {
  // Hundredths × cents = 1/10,000 units; back to cents.
  return divideRoundingHalfUp(toCents(quantity) * toCents(unitPrice), 100n)
}

export interface InvoiceTotals {
  /** One amount per line, in line order. */
  lineAmounts: string[]
  subtotal: string
  tax: string
  total: string
}

/**
 * Line amounts, subtotal, tax (subtotal × rate / 100, rounded to cents), and
 * total. Inputs are the texts of a valid invoice (see the form schema).
 */
export function computeInvoiceTotals(
  lines: ReadonlyArray<{ quantity: string; unitPrice: string }>,
  taxRate: string,
): InvoiceTotals {
  const amounts = lines.map((line) =>
    lineAmountCents(line.quantity, line.unitPrice),
  )
  const subtotal = amounts.reduce((sum, amount) => sum + amount, 0n)
  // Cents × rate in hundredths of a percent = 1/1,000,000 units; to cents.
  const tax = divideRoundingHalfUp(subtotal * toCents(taxRate), 10_000n)
  return {
    lineAmounts: amounts.map(formatCents),
    subtotal: formatCents(subtotal),
    tax: formatCents(tax),
    total: formatCents(subtotal + tax),
  }
}
