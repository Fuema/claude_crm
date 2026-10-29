import { createAuthClient } from 'better-auth/react'

/**
 * Better Auth's browser client, for its own endpoints only: sign-in,
 * sign-out, password reset, and resending the verification email. Everything
 * else goes through server functions (docs/security.md).
 */
export const authClient = createAuthClient()

export interface AuthClientError {
  code?: string
  message?: string
  status: number
}

/** A rejected Better Auth client call, thrown so TanStack Query sees it. */
export class AuthClientFailure extends Error {
  readonly code?: string
  readonly status: number

  constructor(error: AuthClientError) {
    super(error.message ?? `Auth request failed (${error.status})`)
    this.name = 'AuthClientFailure'
    this.code = error.code
    this.status = error.status
  }
}

type AuthResult<T> =
  | { data: T; error: null }
  | { data: null; error: AuthClientError }

/** Better Auth's client returns `{ data, error }`; turn an error into a throw. */
export async function unwrapAuthResult<T>(
  call: Promise<AuthResult<T>>,
): Promise<T> {
  const result = await call
  if (result.error) {
    throw new AuthClientFailure(result.error)
  }
  return result.data
}
