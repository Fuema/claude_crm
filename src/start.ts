import { createSerializationAdapter } from '@tanstack/react-router'
import { createStart } from '@tanstack/react-start'
import { AppError, type AppErrorInit, isAppError } from '@/lib/app-error'
import { errorMiddleware } from '@/server/middleware/error'

/** Sends AppError from server functions to the client with its code intact. */
const appErrorAdapter = createSerializationAdapter({
  key: 'app-error',
  test: isAppError,
  toSerializable: (error: AppError): AppErrorInit => error.toJSON(),
  fromSerializable: (init: AppErrorInit) => new AppError(init),
})

export const startInstance = createStart(() => ({
  serializationAdapters: [appErrorAdapter],
  functionMiddleware: [errorMiddleware],
}))
