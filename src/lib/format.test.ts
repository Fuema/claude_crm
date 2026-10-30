import { formatDate, formatMoney, todayIsoDate } from '@/lib/format'

describe('formatDate', () => {
  it('formats a calendar date the same way on the server and in every browser', () => {
    expect(formatDate('2021-03-04')).toBe('Mar 4, 2021')
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

describe('formatMoney', () => {
  it('formats an amount in its own currency with two decimals', () => {
    expect(formatMoney(12500.5, 'EUR')).toBe('€12,500.50')
    expect(formatMoney(0, 'GBP')).toBe('£0.00')
    expect(formatMoney(1, 'USD')).toBe('$1.00')
  })
})
