import { GENERIC_ERROR_MESSAGE, isAppError } from '@/lib/app-error'
import { AuthClientFailure } from '@/lib/auth-client'

const AUTH_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'The email or password is not correct.',
  EMAIL_NOT_VERIFIED: 'Verify your email before signing in.',
  INVALID_TOKEN: 'This link is invalid or has expired. Ask for a new one.',
  RATE_LIMITED: 'Too many attempts. Wait a minute and try again.',
}

/**
 * The message to show for a failed call: an AppError's own message, our
 * wording for known Better Auth codes (docs/glossary.md), or a generic one.
 * Never an unknown server message.
 */
export function errorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message
  }
  if (error instanceof AuthClientFailure && error.code) {
    return AUTH_MESSAGES[error.code] ?? GENERIC_ERROR_MESSAGE
  }
  return GENERIC_ERROR_MESSAGE
}
