import { createFileRoute } from '@tanstack/react-router'
import { isAppError } from '@/lib/app-error'
import { getAuth } from '@/server/auth'
import { withDb } from '@/server/db'
import { clientIp, getAuthRateLimiter } from '@/server/rate-limit'

/** Better Auth endpoints that are rate-limited per IP (rule 23). */
const RATE_LIMITED_PATHS = new Set([
  '/api/auth/sign-in/email',
  '/api/auth/sign-up/email',
  '/api/auth/request-password-reset',
  '/api/auth/send-verification-email',
])

async function handlePost(request: Request): Promise<Response> {
  if (RATE_LIMITED_PATHS.has(new URL(request.url).pathname)) {
    try {
      await getAuthRateLimiter().check(clientIp(request.headers))
    } catch (error) {
      if (isAppError(error) && error.code === 'RATE_LIMITED') {
        // Better Auth's client reads `code` and `message` from the body.
        return Response.json(error.toJSON(), { status: 429 })
      }
      throw error
    }
  }
  return handle(request)
}

/** Better Auth with a client that is closed once the response is ready. */
function handle(request: Request): Promise<Response> {
  return withDb((db) => getAuth(db).handler(request))
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handlePost(request),
    },
  },
})
