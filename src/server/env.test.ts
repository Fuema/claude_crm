import { describe, expect, it } from 'vitest'
import { parseServerEnv } from '@/server/env'

describe('parseServerEnv', () => {
  it('accepts a PostgreSQL connection string', () => {
    const env = parseServerEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/crm',
    })
    expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/crm')
  })

  it('rejects a missing database URL', () => {
    expect(() => parseServerEnv({})).toThrow('Invalid server environment')
  })

  it('rejects a URL that is not PostgreSQL', () => {
    expect(() =>
      parseServerEnv({ DATABASE_URL: 'https://example.com' }),
    ).toThrow('Invalid server environment')
  })
})
