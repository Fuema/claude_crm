import { describe, expect, it } from 'vitest'
import { getDb } from '@/server/db'
import { checkDatabase } from '@/server/health'

describe('checkDatabase', () => {
  it('reports connected when the database answers', async () => {
    await expect(checkDatabase(getDb())).resolves.toBe('connected')
  })

  it('reports unavailable when the database cannot be reached', async () => {
    const unreachable = getDb('postgresql://postgres:postgres@localhost:1/none')
    await expect(checkDatabase(unreachable)).resolves.toBe('unavailable')
  })
})
