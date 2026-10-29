import { AppError, isAppError } from '@/lib/app-error'

describe('AppError', () => {
  it('keeps its code, message, and field errors', () => {
    const error = new AppError({
      code: 'VALIDATION_FAILED',
      message: 'Check the form.',
      details: { email: ['Enter a valid email'] },
    })
    expect(error.toJSON()).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Check the form.',
      details: { email: ['Enter a valid email'] },
    })
  })

  it('is recognized by isAppError, unlike a plain Error', () => {
    expect(isAppError(new AppError({ code: 'NOT_FOUND', message: 'x' }))).toBe(
      true,
    )
    expect(isAppError(new Error('x'))).toBe(false)
  })
})
