import { createMiddleware } from '@tanstack/react-start'
import { AppError, GENERIC_ERROR_MESSAGE, isAppError } from '@/lib/app-error'
import { logger } from '@/lib/logger'

/**
 * Runs around every server function. An AppError reaches the client as is;
 * anything else is logged here and replaced by a generic message, so stack
 * traces and SQL never leave the server.
 */
export const errorMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    try {
      return await next()
    } catch (error) {
      throw toClientError(error)
    }
  },
)

export function toClientError(error: unknown): unknown {
  if (isAppError(error) || error instanceof Response) {
    return error
  }
  logger.error('Server function failed', { error })
  return new AppError(
    { code: 'INTERNAL', message: GENERIC_ERROR_MESSAGE },
    { cause: error },
  )
}
