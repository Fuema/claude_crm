// Entry point for the Better Auth CLI only (`bun run auth:schema`), which
// reads the auth config to generate its Prisma models. Never imported by the app.
import { createAuth } from '../src/server/auth'
import { getDb } from '../src/server/db'

export const auth = createAuth({
  db: getDb('postgresql://cli:cli@localhost:5432/unused'),
  env: {
    BETTER_AUTH_SECRET: 'cli-only-secret-that-is-never-used-0000',
    BETTER_AUTH_URL: 'http://localhost:3000',
  },
  sendEmail: async () => undefined,
})
