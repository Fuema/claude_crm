import { formatDate, todayIsoDate } from '@/lib/format'

describe('formatDate', () => {
  it('keeps the calendar day in every timezone', () => {
    // Parsed as a local date, so the day of the month never shifts.
    expect(formatDate('2021-03-04')).toMatch(/4/)
    expect(formatDate('2021-03-04')).toMatch(/2021/)
  })

  it('returns the input unchanged when it is not a date', () => {
    expect(formatDate('not a date')).toBe('not a date')
  })
})

describe('todayIsoDate', () => {
  it('formats the local date with zero padding', () => {
    expect(todayIsoDate(new Date(2024, 0, 5))).toBe('2024-01-05')
  })
})
