import {
  archiveCustomer,
  createCustomer,
  getCustomer,
  listCustomers,
  restoreCustomer,
  updateCustomer,
} from '@/features/customers/server/customer-service'
import {
  type CustomerFormValues,
  EMPTY_CUSTOMER_FORM,
} from '@/features/customers/types/customer-form-schema'
import type { CustomerListParams } from '@/features/customers/types/customer-search'
import { isAppError } from '@/lib/app-error'
import { getDb } from '@/server/db'
import type { TenantScope } from '@/server/tenant-db'
import { createTestWorkspace } from '@/tests/factories/workspace'

const db = getDb()

function form(overrides: Partial<CustomerFormValues> = {}): CustomerFormValues {
  return { ...EMPTY_CUSTOMER_FORM, name: 'Acme', ...overrides }
}

const FIRST_PAGE: CustomerListParams = { page: 1, pageSize: 10, q: '' }

async function errorOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  )
  return isAppError(error) ? error.toJSON() : error
}

async function names(scope: TenantScope, params = FIRST_PAGE) {
  const page = await listCustomers(scope, params)
  return page.items.map((customer) => customer.name)
}

describe('createCustomer', () => {
  it('stores an active customer, empty optional fields as null', async () => {
    const scope = await createTestWorkspace(db)
    const customer = await createCustomer(
      scope,
      form({ name: '  Acme Corp  ', website: 'https://acme.test' }),
    )
    expect(customer).toEqual({
      id: expect.any(String),
      name: 'Acme Corp',
      industry: null,
      website: 'https://acme.test',
      email: null,
      phone: null,
      address: null,
      status: 'active',
    })
  })

  it('rejects a name already used in the workspace, ignoring case and archived ones (rule 6)', async () => {
    const scope = await createTestWorkspace(db)
    const existing = await createCustomer(scope, form({ name: 'Acme' }))
    await archiveCustomer(scope, existing.id)

    expect(
      await errorOf(createCustomer(scope, form({ name: ' ACME ' }))),
    ).toEqual({
      code: 'NAME_TAKEN',
      message: 'A customer with this name already exists.',
      details: { name: ['A customer with this name already exists.'] },
    })
  })
})

describe('listCustomers', () => {
  it('sorts by name and pages', async () => {
    const scope = await createTestWorkspace(db)
    for (const name of ['charlie', 'Alpha', 'bravo']) {
      await createCustomer(scope, form({ name }))
    }

    expect(await names(scope)).toEqual(['Alpha', 'bravo', 'charlie'])
    expect(
      await names(scope, { ...FIRST_PAGE, sort: 'name', order: 'desc' }),
    ).toEqual(['charlie', 'bravo', 'Alpha'])
    const secondPage = await listCustomers(scope, {
      ...FIRST_PAGE,
      page: 2,
      pageSize: 10,
    })
    expect(secondPage).toMatchObject({ items: [], total: 3, page: 2 })
  })

  it('searches the name, ignoring case, and filters by status', async () => {
    const scope = await createTestWorkspace(db)
    await createCustomer(scope, form({ name: 'Acme Robotics' }))
    const old = await createCustomer(scope, form({ name: 'Old Acme' }))
    await createCustomer(scope, form({ name: 'Globex' }))
    await archiveCustomer(scope, old.id)

    expect(await names(scope, { ...FIRST_PAGE, q: 'ACME' })).toEqual([
      'Acme Robotics',
      'Old Acme',
    ])
    expect(await names(scope, { ...FIRST_PAGE, status: 'active' })).toEqual([
      'Acme Robotics',
      'Globex',
    ])
    expect(await names(scope, { ...FIRST_PAGE, status: 'archived' })).toEqual([
      'Old Acme',
    ])
  })
})

describe('updateCustomer', () => {
  it('saves the changes of an active customer', async () => {
    const scope = await createTestWorkspace(db)
    const customer = await createCustomer(scope, form())
    const updated = await updateCustomer(
      scope,
      customer.id,
      form({ name: 'Acme Ltd', phone: '+44 20 7946 0000' }),
    )
    expect(updated).toMatchObject({
      name: 'Acme Ltd',
      phone: '+44 20 7946 0000',
    })
  })

  it('refuses to change an archived customer (rule 5)', async () => {
    const scope = await createTestWorkspace(db)
    const customer = await createCustomer(scope, form())
    await archiveCustomer(scope, customer.id)

    expect(
      await errorOf(updateCustomer(scope, customer.id, form({ name: 'New' }))),
    ).toMatchObject({ code: 'CUSTOMER_ARCHIVED' })
    expect((await getCustomer(scope, customer.id)).name).toBe('Acme')
  })

  it('refuses a name another customer has', async () => {
    const scope = await createTestWorkspace(db)
    await createCustomer(scope, form({ name: 'Acme' }))
    const other = await createCustomer(scope, form({ name: 'Globex' }))
    expect(
      await errorOf(updateCustomer(scope, other.id, form({ name: 'acme' }))),
    ).toMatchObject({ code: 'NAME_TAKEN' })
  })

  it('keeps the name when only other fields change, even with different case', async () => {
    const scope = await createTestWorkspace(db)
    const customer = await createCustomer(scope, form({ name: 'Acme' }))
    await expect(
      updateCustomer(scope, customer.id, form({ name: 'ACME' })),
    ).resolves.toMatchObject({ name: 'ACME' })
  })
})

describe('archive and restore', () => {
  it('archives and restores a customer (rule 4)', async () => {
    const scope = await createTestWorkspace(db)
    const customer = await createCustomer(scope, form())
    expect((await archiveCustomer(scope, customer.id)).status).toBe('archived')
    expect((await archiveCustomer(scope, customer.id)).status).toBe('archived')
    expect((await restoreCustomer(scope, customer.id)).status).toBe('active')
  })

  it('reports an unknown customer as NOT_FOUND', async () => {
    const scope = await createTestWorkspace(db)
    expect(await errorOf(archiveCustomer(scope, 'nope'))).toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

describe('workspace isolation (rule 2)', () => {
  it('treats another workspace’s customer as not existing', async () => {
    const workspaceA = await createTestWorkspace(db, 'A')
    const workspaceB = await createTestWorkspace(db, 'B')
    const aCustomer = await createCustomer(workspaceA, form({ name: 'Secret' }))

    expect(await names(workspaceB)).toEqual([])
    for (const attempt of [
      () => getCustomer(workspaceB, aCustomer.id),
      () => updateCustomer(workspaceB, aCustomer.id, form({ name: 'Hijack' })),
      () => archiveCustomer(workspaceB, aCustomer.id),
      () => restoreCustomer(workspaceB, aCustomer.id),
    ]) {
      expect(await errorOf(attempt())).toMatchObject({ code: 'NOT_FOUND' })
    }
    expect(await getCustomer(workspaceA, aCustomer.id)).toMatchObject({
      name: 'Secret',
      status: 'active',
    })
  })

  it('allows the same name in another workspace', async () => {
    const workspaceA = await createTestWorkspace(db, 'A')
    const workspaceB = await createTestWorkspace(db, 'B')
    await createCustomer(workspaceA, form({ name: 'Acme' }))
    await expect(
      createCustomer(workspaceB, form({ name: 'Acme' })),
    ).resolves.toMatchObject({ name: 'Acme' })
  })
})
