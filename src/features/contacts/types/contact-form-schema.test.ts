import {
  type ContactFormValues,
  contactFormSchema,
  EMPTY_CONTACT_FORM,
} from '@/features/contacts/types/contact-form-schema'

const VALID: ContactFormValues = {
  ...EMPTY_CONTACT_FORM,
  firstName: 'Jane',
  lastName: 'Doe',
}

function errorsFor(values: ContactFormValues): Record<string, string> {
  const result = contactFormSchema.safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  )
}

describe('contactFormSchema', () => {
  it('accepts a first and last name with every optional field empty', () => {
    expect(errorsFor(VALID)).toEqual({})
  })

  it('requires a first and last name', () => {
    expect(errorsFor(EMPTY_CONTACT_FORM)).toEqual({
      firstName: 'Enter a first name',
      lastName: 'Enter a last name',
    })
  })

  it('checks the email only when one is entered', () => {
    expect(errorsFor({ ...VALID, email: 'jane@example.com' })).toEqual({})
    expect(errorsFor({ ...VALID, email: 'jane' })).toEqual({
      email: 'Enter a valid email',
    })
  })

  it('limits the phone to 30 characters', () => {
    expect(errorsFor({ ...VALID, phone: '1'.repeat(31) })).toEqual({
      phone: 'Use at most 30 characters',
    })
  })
})
