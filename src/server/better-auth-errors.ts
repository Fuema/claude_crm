import { isAPIError } from 'better-auth/api'

/** The machine-readable code of a Better Auth API error, if it is one. */
export function betterAuthErrorCode(error: unknown): string | undefined {
  if (!isAPIError(error)) {
    return undefined
  }
  const body: unknown = error.body
  if (typeof body === 'object' && body !== null && 'code' in body) {
    return typeof body.code === 'string' ? body.code : undefined
  }
  return undefined
}

/**
 * Any error Better Auth's API throws on purpose (not found, not allowed, …),
 * with or without a code: some of its errors carry only a message.
 */
export function isBetterAuthApiError(error: unknown): boolean {
  return isAPIError(error)
}
