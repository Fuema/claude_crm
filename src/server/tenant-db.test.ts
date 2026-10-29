import { getDb } from '@/server/db'
import { getTenantDb, scopeArgs } from '@/server/tenant-db'
import { createTestWorkspace } from '@/tests/factories/workspace'

const db = getDb()

async function createWorkspace(name: string): Promise<string> {
  return (await createTestWorkspace(db, name)).tenantId
}

function customerData(tenantId: string, name: string) {
  return { tenantId, name, nameNormalized: name.toLowerCase() }
}

describe('getTenantDb', () => {
  it('creates rows in its own workspace, whatever tenantId the caller passes', async () => {
    const a = await createWorkspace('a')
    const b = await createWorkspace('b')

    const created = await getTenantDb(a).customer.create({
      data: customerData(b, 'Acme'),
    })
    expect(created.tenantId).toBe(a)
  })

  it('never reads, updates, or deletes another workspace’s rows', async () => {
    const a = await createWorkspace('a')
    const b = await createWorkspace('b')
    const aCustomer = await getTenantDb(a).customer.create({
      data: customerData(a, 'Only in A'),
    })
    const asB = getTenantDb(b)

    expect(await asB.customer.findMany()).toEqual([])
    expect(await asB.customer.count()).toBe(0)
    expect(
      await asB.customer.findUnique({ where: { id: aCustomer.id } }),
    ).toBeNull()
    await expect(
      asB.customer.update({
        where: { id: aCustomer.id },
        data: { name: 'Hijacked' },
      }),
    ).rejects.toThrow()
    expect(
      (await asB.customer.updateMany({ data: { name: 'Hijacked' } })).count,
    ).toBe(0)
    expect((await asB.customer.deleteMany()).count).toBe(0)

    const unchanged = await db.customer.findUniqueOrThrow({
      where: { id: aCustomer.id },
    })
    expect(unchanged.name).toBe('Only in A')
  })

  it('allows the same name in two workspaces', async () => {
    const a = await createWorkspace('a')
    const b = await createWorkspace('b')
    await getTenantDb(a).customer.create({ data: customerData(a, 'Shared') })
    await expect(
      getTenantDb(b).customer.create({ data: customerData(b, 'Shared') }),
    ).resolves.toMatchObject({ tenantId: b })
  })
})

describe('scopeArgs', () => {
  it('adds the workspace to every row of a bulk create', () => {
    expect(
      scopeArgs('createMany', { data: [{ name: 'x' }, { name: 'y' }] }, 't1'),
    ).toEqual({
      data: [
        { name: 'x', tenantId: 't1' },
        { name: 'y', tenantId: 't1' },
      ],
    })
  })

  it('refuses operations it does not know how to scope', () => {
    expect(() => scopeArgs('findRaw', {}, 't1')).toThrow(
      'Tenant scoping does not support findRaw',
    )
  })
})
