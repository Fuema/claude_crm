import {
  type DealFormValues,
  dealFormSchema,
  EMPTY_DEAL_FORM,
  parseAmount,
} from '@/features/deals/types/deal-form-schema'

const VALID: DealFormValues = {
  ...EMPTY_DEAL_FORM,
  title: 'Factory floor sensors',
  customerId: 'cus-001',
  value: '48000',
}

function errorsFor(values: DealFormValues): Record<string, string> {
  const result = dealFormSchema.safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  )
}

describe('dealFormSchema', () => {
  it('accepts a title, customer, and value with the defaults', () => {
    expect(errorsFor(VALID)).toEqual({})
    expect(EMPTY_DEAL_FORM).toMatchObject({ currency: 'EUR', stage: 'lead' })
  })

  it('requires a title, a customer, and a value', () => {
    expect(errorsFor(EMPTY_DEAL_FORM)).toEqual({
      title: 'Enter a title',
      customerId: 'Choose a customer',
      value:
        'Enter an amount up to 999999999.99, digits only, with at most 2 decimals',
    })
  })

  it.each(['0', '12500', '99.95', '99,5'])('accepts the amount %s', (value) => {
    expect(errorsFor({ ...VALID, value })).toEqual({})
  })

  it.each(['999999999.99'])('accepts the largest amount %s', (value) => {
    expect(errorsFor({ ...VALID, value })).toEqual({})
  })

  it.each(['-5', '1.999', 'abc', '1e5', '1000000000', '12,500.00'])(
    'rejects the amount %s',
    (value) => {
      expect(errorsFor({ ...VALID, value })).toEqual({
        value:
          'Enter an amount up to 999999999.99, digits only, with at most 2 decimals',
      })
    },
  )

  it('reads a decimal comma as a point', () => {
    expect(parseAmount('99,5')).toBe(99.5)
  })
})
