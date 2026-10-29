const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const dateFormatter = new Intl.DateTimeFormat(undefined, {
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
