import type { Db } from '@/server/db'
import { getTenantScope, type TenantScope } from '@/server/tenant-db'

/** A bare workspace (no members), for service tests that need a tenant. */
export async function createTestWorkspace(
  db: Db,
  name = 'Test workspace',
): Promise<TenantScope> {
  const id = crypto.randomUUID()
  await db.organization.create({
    data: { id, name, slug: `test-${id}`, createdAt: new Date() },
  })
  return getTenantScope(id, db)
}
