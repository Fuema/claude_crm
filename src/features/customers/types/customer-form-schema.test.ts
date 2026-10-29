import {
  type CustomerFormValues,
  customerFormSchema,
  EMPTY_CUSTOMER_FORM,
} from '@/features/customers/types/customer-form-schema'

const VALID: CustomerFormValues = {
  ...EMPTY_CUSTOMER_FORM,
  name: 'Acme Corporation',
}

function errorsFor(values: CustomerFormValues): Record<string, string> {
  const result = customerFormSchema.safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  )
}

describe('customerFormSchema', () => {
  it('accepts a name with every optional field left empty', () => {
    expect(errorsFor(VALID)).toEqual({})
  })

  it('requires a name', () => {
    expect(errorsFor({ ...VALID, name: '   ' })).toEqual({
      name: 'Enter a name',
    })
  })

  it.each(['https://acme.example.com', 'http://acme.example.com/about'])(
    'accepts the website %s',
    (website) => {
      expect(errorsFor({ ...VALID, website })).toEqual({})
    },
  )

  it.each(['acme.example.com', 'javascript:alert(1)', 'ftp://acme.example'])(
    'rejects the website %s',
    (website) => {
      expect(errorsFor({ ...VALID, website })).toEqual({
        website: 'Enter a web address starting with http:// or https://',
      })
    },
  )

  it('checks the email only when one is entered', () => {
    expect(errorsFor({ ...VALID, email: 'info@acme.example.com' })).toEqual({})
    expect(errorsFor({ ...VALID, email: 'not an email' })).toEqual({
      email: 'Enter a valid email',
    })
  })

  it('limits the phone to 30 characters', () => {
    expect(errorsFor({ ...VALID, phone: '1'.repeat(30) })).toEqual({})
    expect(errorsFor({ ...VALID, phone: '1'.repeat(31) })).toEqual({
      phone: 'Use at most 30 characters',
    })
  })

  it('trims every field', () => {
    const result = customerFormSchema.parse({
      ...VALID,
      name: '  Acme  ',
      industry: ' Retail ',
    })
    expect(result.name).toBe('Acme')
    expect(result.industry).toBe('Retail')
  })
})
