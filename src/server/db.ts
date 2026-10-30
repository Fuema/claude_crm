import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@/generated/prisma/client'
import { getServerEnv } from '@/server/env'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])
const LOCAL_PROXY_PORT = 5433

/**
 * A local Postgres has no WebSocket endpoint, so route the Neon driver through
 * the `neon-proxy` container from docker-compose.yml.
 */
function routeThroughLocalProxy(): void {
  neonConfig.wsProxy = (host) => `${host}:${LOCAL_PROXY_PORT}/v1`
  neonConfig.useSecureWebSocket = false
  neonConfig.pipelineTLS = false
  neonConfig.pipelineConnect = false
}

/**
 * Creates a Prisma client for one request. A Worker must not share a
 * database connection between requests, so never cache the result globally.
 * Every client opens its own connection pool: close it when the request is
 * done, normally through `withDb`. Feature services use `getTenantDb`
 * instead (docs/data-and-api.md).
 */
export function getDb(connectionString = getServerEnv().DATABASE_URL) {
  if (LOCAL_HOSTS.has(new URL(connectionString).hostname)) {
    routeThroughLocalProxy()
  }
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })
}

export type Db = ReturnType<typeof getDb>

/**
 * Runs `work` with a fresh client and always closes its connections
 * afterwards, even when `work` throws. Without this, every request leaves a
 * pool open until the database refuses new connections.
 */
export async function withDb<T>(work: (db: Db) => Promise<T>): Promise<T> {
  const db = getDb()
  try {
    return await work(db)
  } finally {
    await db.$disconnect()
  }
}
