import { isAppError } from '@/lib/app-error'
import { clientIp, createAuthRateLimiter } from '@/server/rate-limit'

const REDIS = {
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
}

describe('createAuthRateLimiter', () => {
  it('allows the limit, then rejects with RATE_LIMITED', async () => {
    const limiter = createAuthRateLimiter(REDIS, 2)
    const key = `test:${crypto.randomUUID()}`

    await limiter.check(key)
    await limiter.check(key)
    const third = await limiter.check(key).catch((error: unknown) => error)

    expect(isAppError(third) && third.code).toBe('RATE_LIMITED')
  })

  it('counts concurrent requests exactly, without store errors', async () => {
    const errors = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const limiter = createAuthRateLimiter(REDIS, 10)
    const key = `test:${crypto.randomUUID()}`

    const results = await Promise.allSettled(
      Array.from({ length: 15 }, () => limiter.check(key)),
    )

    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(5)
    expect(errors).not.toHaveBeenCalled()
  })

  it('counts each key separately', async () => {
    const limiter = createAuthRateLimiter(REDIS, 1)
    await limiter.check(`test:${crypto.randomUUID()}`)
    await expect(
      limiter.check(`test:${crypto.randomUUID()}`),
    ).resolves.toBeUndefined()
  })

  it('allows the request when the store is unreachable (fail open)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const limiter = createAuthRateLimiter(
      {
        UPSTASH_REDIS_REST_URL: 'http://localhost:1',
        UPSTASH_REDIS_REST_TOKEN: 'x',
      },
      1,
    )
    await limiter.check('any')
    await expect(limiter.check('any')).resolves.toBeUndefined()
  })
})

describe('clientIp', () => {
  it('prefers the address Cloudflare reports', () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.7',
      'x-forwarded-for': '198.51.100.1',
    })
    expect(clientIp(headers)).toBe('203.0.113.7')
  })

  it('never trusts X-Forwarded-For when Cloudflare reports a real address', () => {
    const headers = new Headers({
      'cf-connecting-ip': '2001:db8::1',
      'x-forwarded-for': '10.0.0.1',
    })
    expect(clientIp(headers)).toBe('2001:db8::1')
  })

  it('uses X-Forwarded-For locally, where the runtime reports loopback', () => {
    for (const loopback of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
      const headers = new Headers({
        'cf-connecting-ip': loopback,
        'x-forwarded-for': '10.1.2.3, 10.0.0.1',
      })
      expect(clientIp(headers)).toBe('10.1.2.3')
    }
    expect(clientIp(new Headers({ 'cf-connecting-ip': '127.0.0.1' }))).toBe(
      '127.0.0.1',
    )
  })

  it('falls back to one shared key without any address', () => {
    expect(clientIp(new Headers())).toBe('local')
  })
})
