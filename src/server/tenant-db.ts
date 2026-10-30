import { type Db, getDb } from '@/server/db'

/**
 * Models that belong to a workspace. Every query on them gets the workspace's
 * `tenantId`: added to `where` for reads, updates, and deletes, and to `data`
 * for creates. Add each new tenant-owned model here.
 */
export const TENANT_MODELS: ReadonlySet<string> = new Set([
  'Customer',
  'Contact',
  'Deal',
  'Activity',
  'Invoice',
  'InvoiceLine',
  'InvoiceCounter',
])

const WHERE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
])

const CREATE_OPERATIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
])

/**
 * A Prisma client that can only see and change one workspace's data
 * (docs/data-and-api.md, Tenant scoping). Feature services receive this,
 * never the unscoped `getDb()`.
 *
 * Not covered: nested writes into tenant models through a relation (e.g.
 * creating contacts inside `customer.create`). Services create tenant rows
 * with their own top-level call.
 */
export function getTenantDb(tenantId: string, db: Db = getDb()) {
  return db.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) {
            return query(args)
          }
          // The extension API types `args` per operation; scoping only adds
          // `tenantId`, so the shape stays valid for the same operation.
          return query(scopeArgs(operation, args, tenantId) as typeof args)
        },
      },
    },
  })
}

export type TenantDb = ReturnType<typeof getTenantDb>

/**
 * What feature services receive: the scoped client, plus the workspace id for
 * creates (Prisma's types still ask for `tenantId`; the extension enforces
 * it either way).
 */
export interface TenantScope {
  db: TenantDb
  tenantId: string
}

export function getTenantScope(
  tenantId: string,
  db: Db = getDb(),
): TenantScope {
  return { db: getTenantDb(tenantId, db), tenantId }
}

/** Adds the workspace to a query's arguments; a caller's own tenantId loses. */
export function scopeArgs(
  operation: string,
  args: unknown,
  tenantId: string,
): unknown {
  const input = isRecord(args) ? args : {}
  if (WHERE_OPERATIONS.has(operation)) {
    return { ...input, where: { ...asRecord(input.where), tenantId } }
  }
  if (CREATE_OPERATIONS.has(operation)) {
    const data = input.data
    return {
      ...input,
      data: Array.isArray(data)
        ? data.map((row: unknown) => ({ ...asRecord(row), tenantId }))
        : { ...asRecord(data), tenantId },
    }
  }
  if (operation === 'upsert') {
    return {
      ...input,
      where: { ...asRecord(input.where), tenantId },
      create: { ...asRecord(input.create), tenantId },
    }
  }
  throw new Error(`Tenant scoping does not support ${operation}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}
