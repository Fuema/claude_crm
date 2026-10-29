import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { signUp } from '@/features/auth/server/sign-up-service'
import { signUpSchema } from '@/features/auth/types/auth-schemas'
import { getAuth } from '@/server/auth'
import { getDb } from '@/server/db'
import { clientIp, getAuthRateLimiter } from '@/server/rate-limit'
import { validateInput } from '@/server/validate'

/**
 * Public by nature (no session yet), so it is rate-limited per IP (rule 23).
 * Sign-in, password reset, and sign-out go through Better Auth's own routes.
 */
export const signUpWithWorkspace = createServerFn({ method: 'POST' })
  .validator(validateInput(signUpSchema))
  .handler(async ({ data }) => {
    await getAuthRateLimiter().check(clientIp(new Headers(getRequestHeaders())))
    const db = getDb()
    await signUp(getAuth(db), db, data)
  })
