import {
  AMOUNT_PATTERN,
  computeInvoiceTotals,
  formatCents,
  lineAmountCents,
  TAX_RATE_PATTERN,
  toCents,
} from '@/features/invoices/types/invoice-money'

describe('toCents and formatCents', () => {
  it('reads both decimal separators and pads the cents', () => {
    expect(toCents('12,5')).toBe(1250n)
    expect(toCents('12.05')).toBe(1205n)
    expect(toCents('7')).toBe(700n)
    expect(formatCents(1250n)).toBe('12.50')
    expect(formatCents(5n)).toBe('0.05')
  })
})

describe('lineAmountCents', () => {
  it('multiplies exactly where floats would not (0.1 × 3)', () => {
    expect(formatCents(lineAmountCents('3', '0.10'))).toBe('0.30')
  })

  it('rounds half a cent up', () => {
    // 1.5 × 0.01 = 0.015 → 0.02
    expect(formatCents(lineAmountCents('1.5', '0.01'))).toBe('0.02')
    // 1.25 × 0.01 = 0.0125 → 0.01
    expect(formatCents(lineAmountCents('1.25', '0.01'))).toBe('0.01')
  })
})

describe('computeInvoiceTotals', () => {
  it('adds the lines and rounds the tax to cents', () => {
    const totals = computeInvoiceTotals(
      [
        { quantity: '2', unitPrice: '50.02' },
        { quantity: '1', unitPrice: '0.05' },
      ],
      '19',
    )
    // 2 × 50.02 + 0.05 = 100.09; tax 19.0171 → 19.02
    expect(totals).toEqual({
      lineAmounts: ['100.04', '0.05'],
      subtotal: '100.09',
      tax: '19.02',
      total: '119.11',
    })
  })

  it('stays exact for totals far beyond what a float can hold', () => {
    const lines = Array.from({ length: 100 }, () => ({
      quantity: '999999999.99',
      unitPrice: '999999999.99',
    }))
    const { total } = computeInvoiceTotals(lines, '0')
    // Each line: 999,999,999.99² = 999,999,999,980,000,000.0001, rounded to
    // …000.00; × 100 lines. A float would lose the last digits.
    expect(total).toBe('99999999998000000000.00')
  })

  it('has zero totals without lines', () => {
    expect(computeInvoiceTotals([], '20')).toEqual({
      lineAmounts: [],
      subtotal: '0.00',
      tax: '0.00',
      total: '0.00',
    })
  })
})

describe('patterns', () => {
  it('accepts amounts with up to 9 digits and 2 decimals', () => {
    expect(AMOUNT_PATTERN.test('999999999.99')).toBe(true)
    expect(AMOUNT_PATTERN.test('1000000000')).toBe(false)
    expect(AMOUNT_PATTERN.test('1.234')).toBe(false)
  })

  it('accepts tax rates from 0 to 100', () => {
    for (const rate of ['0', '7.5', '19', '99.99', '100', '100.00']) {
      expect(TAX_RATE_PATTERN.test(rate)).toBe(true)
    }
    for (const rate of ['100.01', '101', '-1', '5.555']) {
      expect(TAX_RATE_PATTERN.test(rate)).toBe(false)
    }
  })
})
