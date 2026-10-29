import { AppError } from '@/lib/app-error'
import { AuthClientFailure } from '@/lib/auth-client'
import { errorMessage } from '@/lib/error-message'

describe('errorMessage', () => {
  it('shows the message of an AppError', () => {
    expect(
      errorMessage(new AppError({ code: 'NOT_FOUND', message: 'Gone.' })),
    ).toBe('Gone.')
  })

  it('uses our wording for known Better Auth codes', () => {
    expect(
      errorMessage(
        new AuthClientFailure({
          code: 'INVALID_EMAIL_OR_PASSWORD',
          message: 'Invalid email or password',
          status: 401,
        }),
      ),
    ).toBe('The email or password is not correct.')
  })

  it('never shows an unknown server message', () => {
    expect(
      errorMessage(
        new AuthClientFailure({ code: 'NEW', message: 'raw', status: 500 }),
      ),
    ).toBe('Something went wrong. Try again.')
    expect(errorMessage(new Error('SQL failed'))).toBe(
      'Something went wrong. Try again.',
    )
  })
})
