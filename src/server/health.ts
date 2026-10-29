import { createServerFn } from '@tanstack/react-start'
import { logger } from '@/lib/logger'
import { type Db, getDb } from '@/server/db'

export type DatabaseStatus = 'connected' | 'unavailable'

export interface Health {
  database: DatabaseStatus
}

export async function checkDatabase(db: Db): Promise<DatabaseStatus> {
  try {
    await db.$queryRaw`SELECT 1`
    return 'connected'
  } catch (error) {
    logger.error('Health check: database query failed', { error })
    return 'unavailable'
  } finally {
    await db.$disconnect()
  }
}

/** The only server function that needs no session (docs/security.md). */
export const getHealth = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Health> => ({ database: await checkDatabase(getDb()) }),
)
