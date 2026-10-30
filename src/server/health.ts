import { logger } from '@/lib/logger'
import type { Db } from '@/server/db'

export type DatabaseStatus = 'connected' | 'unavailable'

export async function checkDatabase(db: Db): Promise<DatabaseStatus> {
  try {
    await db.$queryRaw`SELECT 1`
    return 'connected'
  } catch (error) {
    logger.error('Health check: database query failed', { error })
    return 'unavailable'
  }
}
