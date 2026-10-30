import { getDb, withDb } from '@/server/db'

const observer = getDb()

/** Connections to this test database, other than the observer's own. */
async function openConnections(): Promise<number> {
  const [row] = await observer.$queryRaw<[{ count: bigint }]>`
    SELECT count(*) AS count FROM pg_stat_activity
    WHERE datname = current_database() AND pid <> pg_backend_pid()
  `
  return Number(row.count)
}

afterAll(async () => {
  await observer.$disconnect()
})

describe('withDb', () => {
  it('closes the connections it opened, so requests do not leak them', async () => {
    const before = await openConnections()
    for (let i = 0; i < 5; i++) {
      await withDb((db) => db.$queryRaw`SELECT 1`)
    }
    await vi.waitFor(async () => {
      expect(await openConnections()).toBeLessThanOrEqual(before)
    })
  })

  it('closes them when the work fails too', async () => {
    const before = await openConnections()
    await expect(
      withDb(async (db) => {
        await db.$queryRaw`SELECT 1`
        throw new Error('handler failed')
      }),
    ).rejects.toThrow('handler failed')
    await vi.waitFor(async () => {
      expect(await openConnections()).toBeLessThanOrEqual(before)
    })
  })
})
