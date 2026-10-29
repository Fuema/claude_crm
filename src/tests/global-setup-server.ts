import { execSync } from 'node:child_process'
import { loadEnv } from 'vite'
import { getDb } from '@/server/db'

/**
 * Once per `bun run test`: bring the crm_test database up to the latest
 * migration and empty it, so every run starts from the same state.
 */
export default async function setup(): Promise<void> {
  const testDatabaseUrl = loadEnv('test', process.cwd(), '').TEST_DATABASE_URL
  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL is not set. Copy .env.example to .env.')
  }
  execSync('bun x prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'pipe',
  })

  const db = getDb(testDatabaseUrl)
  try {
    // Static SQL: empties every table except Prisma's migration history.
    await db.$executeRaw`
      DO $$
      DECLARE table_row record;
      BEGIN
        FOR table_row IN
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
        LOOP
          EXECUTE format('TRUNCATE TABLE %I CASCADE', table_row.tablename);
        END LOOP;
      END $$;
    `
  } finally {
    await db.$disconnect()
  }
}
