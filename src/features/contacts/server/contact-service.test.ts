import {
  createContact,
  deleteContact,
  listCustomerContacts,
  updateContact,
} from '@/features/contacts/server/contact-service'
import {
  type ContactFormValues,
  EMPTY_CONTACT_FORM,
} from '@/features/contacts/types/contact-form-schema'
import {
  archiveCustomer,
  createCustomer,
} from '@/features/customers/server/customer-service'
import { EMPTY_CUSTOMER_FORM } from '@/features/customers/types/customer-form-schema'
import { isAppError } from '@/lib/app-error'
import { getDb } from '@/server/db'
import type { TenantScope } from '@/server/tenant-db'
import { createTestWorkspace } from '@/tests/factories/workspace'

const db = getDb()

function contact(
  overrides: Partial<ContactFormValues> = {},
): ContactFormValues {
  return {
    ...EMPTY_CONTACT_FORM,
    firstName: 'Ada',
    lastName: 'Lovelace',
    ...overrides,
  }
}

async function workspaceWithCustomer(name = 'Acme') {
  const scope = await createTestWorkspace(db)
  const customer = await createCustomer(scope, {
    ...EMPTY_CUSTOMER_FORM,
    name,
  })
  return { scope, customer }
}

async function errorCode(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  )
  return isAppError(error) ? error.code : error
}

async function fullNames(scope: TenantScope, customerId: string) {
  return (await listCustomerContacts(scope, customerId)).map((c) => c.fullName)
}

describe('contacts of a customer', () => {
  it('adds contacts and lists them by last name, then first name', async () => {
    const { scope, customer } = await workspaceWithCustomer()
    await createContact(
      scope,
      customer.id,
      contact({ firstName: 'Zoe', lastName: 'Bell' }),
    )
    await createContact(
      scope,
      customer.id,
      contact({ firstName: 'Amy', lastName: 'Bell' }),
    )
    await createContact(
      scope,
      customer.id,
      contact({ firstName: 'Ada', lastName: 'Adams' }),
    )

    expect(await fullNames(scope, customer.id)).toEqual([
      'Ada Adams',
      'Amy Bell',
      'Zoe Bell',
    ])
  })

  it('stores empty optional fields as null and allows a shared email (rule 9)', async () => {
    const { scope, customer } = await workspaceWithCustomer()
    const first = await createContact(
      scope,
      customer.id,
      contact({ email: 'team@acme.test' }),
    )
    const second = await createContact(
      scope,
      customer.id,
      contact({ firstName: 'Bob', email: 'team@acme.test' }),
    )
    expect(first).toMatchObject({ jobTitle: null, phone: null })
    expect(second.email).toBe(first.email)
  })

  it('edits and deletes a contact (rule 7)', async () => {
    const { scope, customer } = await workspaceWithCustomer()
    const created = await createContact(scope, customer.id, contact())

    const updated = await updateContact(
      scope,
      created.id,
      contact({ jobTitle: 'CTO' }),
    )
    expect(updated.jobTitle).toBe('CTO')

    await deleteContact(scope, created.id)
    expect(await fullNames(scope, customer.id)).toEqual([])
    expect(await errorCode(deleteContact(scope, created.id))).toBe('NOT_FOUND')
  })

  it('makes an archived customer’s contacts read-only (rule 8)', async () => {
    const { scope, customer } = await workspaceWithCustomer()
    const created = await createContact(scope, customer.id, contact())
    await archiveCustomer(scope, customer.id)

    expect(await fullNames(scope, customer.id)).toEqual(['Ada Lovelace'])
    expect(await errorCode(createContact(scope, customer.id, contact()))).toBe(
      'CUSTOMER_ARCHIVED',
    )
    expect(
      await errorCode(
        updateContact(scope, created.id, contact({ jobTitle: 'X' })),
      ),
    ).toBe('CUSTOMER_ARCHIVED')
    expect(await errorCode(deleteContact(scope, created.id))).toBe(
      'CUSTOMER_ARCHIVED',
    )
  })

  it('reports an unknown customer as NOT_FOUND', async () => {
    const scope = await createTestWorkspace(db)
    expect(await errorCode(listCustomerContacts(scope, 'nope'))).toBe(
      'NOT_FOUND',
    )
    expect(await errorCode(createContact(scope, 'nope', contact()))).toBe(
      'NOT_FOUND',
    )
  })
})

describe('workspace isolation (rule 2)', () => {
  it('treats another workspace’s customer and contacts as not existing', async () => {
    const a = await workspaceWithCustomer('A customer')
    const b = await createTestWorkspace(db, 'B')
    const aContact = await createContact(a.scope, a.customer.id, contact())

    for (const attempt of [
      () => listCustomerContacts(b, a.customer.id),
      () => createContact(b, a.customer.id, contact()),
      () => updateContact(b, aContact.id, contact({ firstName: 'Hijack' })),
      () => deleteContact(b, aContact.id),
    ]) {
      expect(await errorCode(attempt())).toBe('NOT_FOUND')
    }
    expect(await fullNames(a.scope, a.customer.id)).toEqual(['Ada Lovelace'])
  })
})
