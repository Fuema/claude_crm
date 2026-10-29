import { z } from 'zod'

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
    UPSTASH_REDIS_REST_URL: z.url({ protocol: /^https?$/ }),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    EMAIL_TRANSPORT: z.enum(['mailpit', 'resend']),
    EMAIL_FROM: z.string().min(3),
    MAILPIT_URL: z.url({ protocol: /^https?$/ }).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
  })
  .refine((env) => env.EMAIL_TRANSPORT !== 'mailpit' || env.MAILPIT_URL, {
    message: 'MAILPIT_URL is required when EMAIL_TRANSPORT is mailpit',
    path: ['MAILPIT_URL'],
  })
  .refine((env) => env.EMAIL_TRANSPORT !== 'resend' || env.RESEND_API_KEY, {
    message: 'RESEND_API_KEY is required when EMAIL_TRANSPORT is resend',
    path: ['RESEND_API_KEY'],
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
