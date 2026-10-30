/**
 * One fixed locale for all formatting. Pages render on the server first; with
 * the runtime's default locale, a browser set to another language would
 * format differently and React would report a hydration mismatch. The UI is
 * in English, so numbers and dates follow it.
 */
export const DISPLAY_LOCALE = 'en-US'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const dateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  dateStyle: 'medium',
})

/**
 * Parses a calendar date ("YYYY-MM-DD") as a local date. `new Date(iso)`
 * would read it as UTC midnight and can show the previous day.
 */
function parseIsoDate(isoDate: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(isoDate)
  if (!match) {
    return null
  }
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

/** Formats a calendar date ("YYYY-MM-DD") for display, e.g. "Mar 4, 2021". */
export function formatDate(isoDate: string): string {
  const date = parseIsoDate(isoDate)
  return date ? dateFormatter.format(date) : isoDate
}

/** Today's local calendar date as "YYYY-MM-DD". */
export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const moneyFormatters = new Map<string, Intl.NumberFormat>()

const DECIMAL_STRING = /^(\d+)(?:\.(\d{1,2}))?$/

/**
 * Formats an amount in its own currency (an ISO 4217 code such as "EUR"),
 * e.g. "€12,500.00". Amounts are never converted between currencies. A
 * non-negative decimal string with at most 2 decimals ("1234.50", as invoices
 * use) is formatted exactly, without passing through a float.
 */
export function formatMoney(value: number | string, currency: string): string {
  let formatter = moneyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat(DISPLAY_LOCALE, {
      style: 'currency',
      currency,
    })
    moneyFormatters.set(currency, formatter)
  }
  if (typeof value === 'number') {
    return formatter.format(value)
  }
  const match = DECIMAL_STRING.exec(value)
  if (!match) {
    throw new Error(`Not an amount: ${value}`)
  }
  // The whole part as a bigint is exact at any size; the cents replace the
  // formatted fraction (all supported currencies have 2 decimals).
  const [, whole = '0', cents = ''] = match
  return formatter
    .formatToParts(BigInt(whole))
    .map((part) =>
      part.type === 'fraction' ? cents.padEnd(2, '0') : part.value,
    )
    .join('')
}
