import { AppError, isAppError } from '@/lib/app-error'
import { toClientError } from '@/server/middleware/error'

describe('toClientError', () => {
  it('passes an AppError through unchanged', () => {
    const error = new AppError({ code: 'NOT_FOUND', message: 'Not found.' })
    expect(toClientError(error)).toBe(error)
  })

  it('hides an unexpected error behind a generic message', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const result = toClientError(new Error('relation "user" does not exist'))
    expect(isAppError(result) && result.toJSON()).toEqual({
      code: 'INTERNAL',
      message: 'Something went wrong. Try again.',
      details: undefined,
    })
  })
})
