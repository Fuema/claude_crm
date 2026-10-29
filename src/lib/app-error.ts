/**
 * Error codes the client can act on (docs/project.md, Error codes). Shared by
 * server and client, so it must not import anything server-only.
 */
export const ERROR_CODES = [
  'UNAUTHENTICATED',
  'NO_ACTIVE_WORKSPACE',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'NAME_TAKEN',
  'CUSTOMER_ARCHIVED',
  'RATE_LIMITED',
  'CONFLICT',
  'INTERNAL',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export type FieldErrors = Record<string, string[]>

export interface AppErrorInit {
  code: ErrorCode
  /** Safe to show to the user. */
  message: string
  details?: FieldErrors
}

/** A failure the user can understand; sent to the client as is. */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly details?: FieldErrors

  constructor(init: AppErrorInit, options?: ErrorOptions) {
    super(init.message, options)
    this.name = 'AppError'
    this.code = init.code
    this.details = init.details
  }

  toJSON(): AppErrorInit {
    return { code: this.code, message: this.message, details: this.details }
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Try again.'
