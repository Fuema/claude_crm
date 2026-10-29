import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'
import { isAppError } from '@/lib/app-error'
import { errorMessage } from '@/lib/error-message'

/**
 * Shows a failed submit inside the form: field errors from
 * `AppError.details` on their fields, everything else as `root.server`.
 */
export function showSubmitError<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  fields: ReadonlyArray<FieldPath<TValues>>,
): void {
  const details = isAppError(error) ? error.details : undefined
  let shownOnField = false
  for (const field of fields) {
    const message = details?.[field]?.[0]
    if (message) {
      setError(
        field,
        { type: 'server', message },
        { shouldFocus: !shownOnField },
      )
      shownOnField = true
    }
  }
  if (!shownOnField) {
    setError('root.server', { type: 'server', message: errorMessage(error) })
  }
}
