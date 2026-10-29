import { z } from 'zod'

const serverEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

/**
 * Validates the server's environment. On Workers, `nodejs_compat` fills
 * `process.env` from vars and secrets; locally Wrangler reads `.env`.
 */
export function parseServerEnv(raw: Record<string, unknown>): ServerEnv {
  const result = serverEnvSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(
      `Invalid server environment: ${z.prettifyError(result.error)}`,
      { cause: result.error },
    )
  }
  return result.data
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env)
}
