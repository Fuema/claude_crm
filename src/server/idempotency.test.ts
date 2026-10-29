import { isAppError } from '@/lib/app-error'
import { createIdempotencyStore } from '@/server/idempotency'

const store = createIdempotencyStore({
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
})

function newKey(): string {
  return crypto.randomUUID()
}

async function errorCode(promise: Promise<unknown>): Promise<string | false> {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  )
  return isAppError(error) && error.code
}

describe('createIdempotencyStore', () => {
  it('runs the action once and replays its result for a retry', async () => {
    const key = newKey()
    const action = vi.fn(async () => ({ id: 'c1', name: 'Acme' }))

    const first = await store.run('t1', key, { name: 'Acme' }, action)
    const retry = await store.run('t1', key, { name: 'Acme' }, action)

    expect(action).toHaveBeenCalledTimes(1)
    expect(retry).toEqual(first)
  })

  it('rejects the same key with a different input', async () => {
    const key = newKey()
    await store.run('t1', key, { name: 'Acme' }, async () => 'ok')
    expect(
      await errorCode(store.run('t1', key, { name: 'Other' }, async () => 'x')),
    ).toBe('CONFLICT')
  })

  it('rejects a second request while the first is still running', async () => {
    const key = newKey()
    let finish: () => void = () => undefined
    let started: () => void = () => undefined
    const hasStarted = new Promise<void>((resolve) => (started = resolve))
    const slow = store.run(
      't1',
      key,
      {},
      () =>
        new Promise<string>((resolve) => {
          finish = () => resolve('ok')
          started()
        }),
    )
    // The first request holds the key only once its action runs.
    await hasStarted
    expect(await errorCode(store.run('t1', key, {}, async () => 'x'))).toBe(
      'CONFLICT',
    )
    finish()
    await expect(slow).resolves.toBe('ok')
  })

  it('lets a failed attempt be retried with the same key', async () => {
    const key = newKey()
    await expect(
      store.run('t1', key, {}, async () => {
        throw new Error('database down')
      }),
    ).rejects.toThrow('database down')
    await expect(store.run('t1', key, {}, async () => 'ok')).resolves.toBe('ok')
  })

  it('keeps workspaces apart even with the same key', async () => {
    const key = newKey()
    await store.run('t1', key, { name: 'A' }, async () => 'first')
    await expect(
      store.run('t2', key, { name: 'B' }, async () => 'second'),
    ).resolves.toBe('second')
  })

  it('runs the action when the store is unreachable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const offline = createIdempotencyStore({
      UPSTASH_REDIS_REST_URL: 'http://localhost:1',
      UPSTASH_REDIS_REST_TOKEN: 'x',
    })
    await expect(
      offline.run('t1', newKey(), {}, async () => 'ok'),
    ).resolves.toBe('ok')
  })
})
