import { parseServerEnv } from '@/server/env'

const VALID = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/crm',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  UPSTASH_REDIS_REST_URL: 'http://localhost:8079',
  UPSTASH_REDIS_REST_TOKEN: 'token',
  EMAIL_TRANSPORT: 'mailpit',
  EMAIL_FROM: 'CRM <crm@example.test>',
  MAILPIT_URL: 'http://localhost:8025',
}

describe('parseServerEnv', () => {
  it('accepts a complete local environment', () => {
    expect(parseServerEnv(VALID).DATABASE_URL).toBe(VALID.DATABASE_URL)
  })

  it('rejects a missing database URL', () => {
    expect(() => parseServerEnv({ ...VALID, DATABASE_URL: undefined })).toThrow(
      'Invalid server environment',
    )
  })

  it('rejects a URL that is not PostgreSQL', () => {
    expect(() =>
      parseServerEnv({ ...VALID, DATABASE_URL: 'https://example.com' }),
    ).toThrow('Invalid server environment')
  })

  it('rejects a short auth secret', () => {
    expect(() =>
      parseServerEnv({ ...VALID, BETTER_AUTH_SECRET: 'short' }),
    ).toThrow('Invalid server environment')
  })

  it('requires an API key when sending through Resend', () => {
    expect(() =>
      parseServerEnv({ ...VALID, EMAIL_TRANSPORT: 'resend' }),
    ).toThrow('RESEND_API_KEY is required')
  })
})
