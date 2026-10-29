import { Redis } from '@upstash/redis'
import { AppError } from '@/lib/app-error'
import { logger } from '@/lib/logger'
import { getServerEnv, type ServerEnv } from '@/server/env'

const IN_PROGRESS_TTL_SECONDS = 60
const RESULT_TTL_SECONDS = 24 * 60 * 60

type Entry =
  | { status: 'in-progress'; inputHash: string }
  | { status: 'done'; inputHash: string; result: unknown }

export interface IdempotencyStore {
  /**
   * Runs `action` once per key: a retry with the same key and input returns
   * the first result; the same key with different input, or while the first
   * run is still going, is CONFLICT (docs/resiliency.md, Idempotency).
   */
  run<T>(
    scope: string,
    key: string,
    input: unknown,
    action: () => Promise<T>,
  ): Promise<T>
}

export function createIdempotencyStore(
  env: Pick<ServerEnv, 'UPSTASH_REDIS_REST_URL' | 'UPSTASH_REDIS_REST_TOKEN'>,
): IdempotencyStore {
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
    retry: { retries: 0 },
  })

  return {
    async run<T>(
      scope: string,
      key: string,
      input: unknown,
      action: () => Promise<T>,
    ) {
      const redisKey = `idem:${scope}:${key}`
      const inputHash = await hashInput(input)

      let claimed: boolean
      try {
        const pending: Entry = { status: 'in-progress', inputHash }
        claimed =
          (await redis.set(redisKey, pending, {
            nx: true,
            ex: IN_PROGRESS_TTL_SECONDS,
          })) === 'OK'
      } catch (error) {
        // Without Redis, run anyway: unique constraints still protect the data.
        logger.error('Idempotency store unreachable; running without it', {
          error,
        })
        return action()
      }

      if (!claimed) {
        return replay<T>(await redis.get<Entry>(redisKey), inputHash)
      }

      let result: T
      try {
        result = await action()
      } catch (error) {
        // A failed attempt may be retried with the same key.
        await redis.del(redisKey).catch((cleanupError: unknown) => {
          logger.error('Could not release an idempotency key', {
            error: cleanupError,
          })
        })
        throw error
      }
      const done: Entry = { status: 'done', inputHash, result }
      await redis.set(redisKey, done, { ex: RESULT_TTL_SECONDS })
      return result
    },
  }
}

/**
 * The first run's stored result. Values round-trip through JSON, so actions
 * must return plain data (models, not class instances).
 */
function replay<T>(entry: Entry | null, inputHash: string): T {
  if (!entry || entry.inputHash !== inputHash) {
    throw new AppError({
      code: 'CONFLICT',
      message:
        'This request does not match the earlier one. Reload and try again.',
    })
  }
  if (entry.status === 'in-progress') {
    throw new AppError({
      code: 'CONFLICT',
      message: 'This request is already being processed.',
    })
  }
  // Stored by `run` from the same action, so it has the action's type.
  return entry.result as T
}

async function hashInput(input: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(input))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export function getIdempotencyStore(): IdempotencyStore {
  return createIdempotencyStore(getServerEnv())
}
