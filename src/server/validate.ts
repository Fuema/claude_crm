import type { z } from 'zod'
import { AppError, type FieldErrors } from '@/lib/app-error'

/**
 * Validator for `createServerFn().validator(...)`. A raw Zod schema would
 * reject with a plain Error holding the issues as JSON; this rejects with
 * VALIDATION_FAILED and field errors the form can show.
 */
export function validateInput<TSchema extends z.ZodType>(schema: TSchema) {
  return (input: unknown): z.output<TSchema> => {
    const result = schema.safeParse(input)
    if (!result.success) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: 'Check the highlighted fields.',
        details: toFieldErrors(result.error.issues),
      })
    }
    return result.data
  }
}

function toFieldErrors(issues: ReadonlyArray<z.core.$ZodIssue>): FieldErrors {
  const details: FieldErrors = {}
  for (const issue of issues) {
    const field = issue.path.join('.') || 'root'
    details[field] = [...(details[field] ?? []), issue.message]
  }
  return details
}
