import { z } from 'zod'
import { isAppError } from '@/lib/app-error'
import { validateInput } from '@/server/validate'

const schema = z.object({
  email: z.email('Enter a valid email'),
  name: z.string().min(1, 'Name is required'),
})

describe('validateInput', () => {
  it('returns the parsed input when it is valid', () => {
    expect(validateInput(schema)({ email: 'a@b.co', name: 'Ada' })).toEqual({
      email: 'a@b.co',
      name: 'Ada',
    })
  })

  it('throws VALIDATION_FAILED with an error per field', () => {
    let caught: unknown
    try {
      validateInput(schema)({ email: 'nope', name: '' })
    } catch (error) {
      caught = error
    }
    expect(isAppError(caught) && caught.toJSON()).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Check the highlighted fields.',
      details: { email: ['Enter a valid email'], name: ['Name is required'] },
    })
  })
})
