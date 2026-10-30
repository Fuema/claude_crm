import { createSerializationAdapter } from '@tanstack/react-router'
import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import { AppError, type AppErrorInit, isAppError } from '@/lib/app-error'
import { errorMiddleware } from '@/server/middleware/error'

/** Sends AppError from server functions to the client with its code intact. */
const appErrorAdapter = createSerializationAdapter({
  key: 'app-error',
  test: isAppError,
  toSerializable: (error: AppError): AppErrorInit => error.toJSON(),
  fromSerializable: (init: AppErrorInit) => new AppError(init),
})

/**
 * Server functions run with the session cookie, so a request from another
 * site must not reach them (docs/security.md). Better Auth's own routes check
 * the origin themselves.
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

export const startInstance = createStart(() => ({
  serializationAdapters: [appErrorAdapter],
  requestMiddleware: [csrfMiddleware],
  functionMiddleware: [errorMiddleware],
}))
