import { Redis } from '@upstash/redis'
import { AppError } from '@/lib/app-error'
import { logger } from '@/lib/logger'
import { getServerEnv, type ServerEnv } from '@/server/env'

/** docs/project.md, rule 23: sign-up, sign-in, and password reset requests. */
export const AUTH_ATTEMPTS_PER_MINUTE = 10

export const RATE_LIMITED_MESSAGE =
  'Too many attempts. Wait a minute and try again.'

const WINDOW_MS = 60_000

export interface RateLimiter {
  /** Resolves when the request may go ahead; rejects with RATE_LIMITED. */
  check(key: string): Promise<void>
}

/**
 * Fixed one-minute window: INCR a per-minute counter and let it expire.
 * (@upstash/ratelimit's scripts use an Upstash-only Lua flag, so they cannot
 * run against the local Redis; see ADR 0003.)
 */
export function createAuthRateLimiter(
  env: Pick<ServerEnv, 'UPSTASH_REDIS_REST_URL' | 'UPSTASH_REDIS_REST_TOKEN'>,
  limit = AUTH_ATTEMPTS_PER_MINUTE,
  now: () => number = Date.now,
): RateLimiter {
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
    // Fail fast so an outage does not hold up sign-in (we fail open).
    retry: { retries: 0 },
  })

  return {
    async check(key) {
      const windowKey = `rl:auth:${key}:${Math.floor(now() / WINDOW_MS)}`
      let count: number
      try {
        // Two plain commands, no MULTI: the local REST emulator shares one
        // Redis connection, so concurrent transactions would collide. NX sets
        // the lifetime only once, and a later request sets it if this one
        // stopped in between.
        count = await redis.incr(windowKey)
        await redis.expire(windowKey, (2 * WINDOW_MS) / 1000, 'NX')
      } catch (error) {
        // Fail open: an unreachable store must not lock everyone out.
        logger.error('Rate limit store unreachable; request allowed', {
          error,
        })
        return
      }
      if (count > limit) {
        throw new AppError({
          code: 'RATE_LIMITED',
          message: RATE_LIMITED_MESSAGE,
        })
      }
    },
  }
}

export function getAuthRateLimiter(): RateLimiter {
  return createAuthRateLimiter(getServerEnv())
}

/**
 * The client's IP address, from CF-Connecting-IP, which Cloudflare sets from
 * the real connection. Only in local development is it a loopback address
 * (the local runtime sets it); then X-Forwarded-For is used if present, so
 * E2E tests can act as different clients. In production it is never loopback,
 * so X-Forwarded-For (which clients can forge) is never trusted there.
 */
export function clientIp(headers: Headers): string {
  const connecting = headers.get('cf-connecting-ip')
  if (connecting && !isLoopback(connecting)) {
    return connecting
  }
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    connecting ||
    'local'
  )
}

function isLoopback(ip: string): boolean {
  return ip === '::1' || ip.startsWith('127.') || ip.startsWith('::ffff:127.')
}
