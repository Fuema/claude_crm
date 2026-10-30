import {
  createContact,
  deleteContact,
} from '@/features/contacts/server/contact-service'
import { EMPTY_CONTACT_FORM } from '@/features/contacts/types/contact-form-schema'
import {
  archiveCustomer,
  createCustomer,
} from '@/features/customers/server/customer-service'
import { EMPTY_CUSTOMER_FORM } from '@/features/customers/types/customer-form-schema'
import {
  changeDealStage,
  createDeal,
  deleteDeal,
  getDeal,
  listBoardDeals,
  listCustomerDeals,
  listDeals,
  updateDeal,
} from '@/features/deals/server/deal-service'
import {
  type DealFormValues,
  EMPTY_DEAL_FORM,
} from '@/features/deals/types/deal-form-schema'
import type { DealListParams } from '@/features/deals/types/deal-search'
import { isAppError } from '@/lib/app-error'
import { getDb } from '@/server/db'
import type { TenantScope } from '@/server/tenant-db'
import { createTestWorkspace } from '@/tests/factories/workspace'

const db = getDb()
const FIRST_PAGE: DealListParams = { page: 1, pageSize: 10, q: '' }

async function setup(customerName = 'Acme') {
  const scope = await createTestWorkspace(db)
  const customer = await createCustomer(scope, {
    ...EMPTY_CUSTOMER_FORM,
    name: customerName,
  })
  return { scope, customer }
}

function deal(
  customerId: string,
  overrides: Partial<DealFormValues> = {},
): DealFormValues {
  return {
    ...EMPTY_DEAL_FORM,
    title: 'Website redesign',
    customerId,
    value: '12500.50',
    ...overrides,
  }
}

function editable({ customerId: _, ...values }: DealFormValues) {
  return values
}

async function errorOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  )
  return isAppError(error) ? error.toJSON() : error
}

async function titles(scope: TenantScope, params = FIRST_PAGE) {
  return (await listDeals(scope, params)).items.map((d) => d.title)
}

describe('createDeal', () => {
  it('stores the value exactly and returns the customer and contact', async () => {
    const { scope, customer } = await setup()
    const contact = await createContact(scope, customer.id, {
      ...EMPTY_CONTACT_FORM,
      firstName: 'Jane',
      lastName: 'Doe',
    })
    const created = await createDeal(
      scope,
      deal(customer.id, {
        contactId: contact.id,
        value: '0,10',
        currency: 'GBP',
        expectedCloseDate: '2026-12-31',
      }),
    )
    expect(created).toMatchObject({
      title: 'Website redesign',
      customer: { id: customer.id, name: 'Acme', isArchived: false },
      contact: { id: contact.id, name: 'Jane Doe' },
      value: 0.1,
      currency: 'GBP',
      stage: 'lead',
      expectedCloseDate: '2026-12-31',
    })
    const row = await db.deal.findUniqueOrThrow({ where: { id: created.id } })
    expect(row.value.toString()).toBe('0.1')
  })

  it('rejects a contact of another customer (rule 13)', async () => {
    const { scope, customer } = await setup()
    const other = await createCustomer(scope, {
      ...EMPTY_CUSTOMER_FORM,
      name: 'Other',
    })
    const otherContact = await createContact(scope, other.id, {
      ...EMPTY_CONTACT_FORM,
      firstName: 'Not',
      lastName: 'Theirs',
    })
    expect(
      await errorOf(
        createDeal(scope, deal(customer.id, { contactId: otherContact.id })),
      ),
    ).toMatchObject({
      code: 'VALIDATION_FAILED',
      details: { contactId: ["Choose one of the customer's contacts"] },
    })
  })

  it('refuses an archived customer (rule 12)', async () => {
    const { scope, customer } = await setup()
    await archiveCustomer(scope, customer.id)
    expect(await errorOf(createDeal(scope, deal(customer.id)))).toMatchObject({
      code: 'CUSTOMER_ARCHIVED',
    })
  })
})

describe('listDeals', () => {
  it('searches, filters, sorts by title or close date (no date last), and pages', async () => {
    const { scope, customer } = await setup()
    const second = await createCustomer(scope, {
      ...EMPTY_CUSTOMER_FORM,
      name: 'Second',
    })
    await createDeal(
      scope,
      deal(customer.id, { title: 'beta', expectedCloseDate: '2026-03-01' }),
    )
    await createDeal(scope, deal(customer.id, { title: 'Alpha', stage: 'won' }))
    await createDeal(
      scope,
      deal(second.id, { title: 'Gamma', expectedCloseDate: '2026-01-15' }),
    )

    expect(await titles(scope)).toEqual(['Alpha', 'beta', 'Gamma'])
    expect(await titles(scope, { ...FIRST_PAGE, q: 'ET' })).toEqual(['beta'])
    expect(await titles(scope, { ...FIRST_PAGE, stage: 'won' })).toEqual([
      'Alpha',
    ])
    expect(
      await titles(scope, { ...FIRST_PAGE, customerId: second.id }),
    ).toEqual(['Gamma'])
    expect(
      await titles(scope, {
        ...FIRST_PAGE,
        sort: 'expectedCloseDate',
        order: 'desc',
      }),
    ).toEqual(['beta', 'Gamma', 'Alpha'])
    expect(await listDeals(scope, { ...FIRST_PAGE, page: 2 })).toMatchObject({
      items: [],
      total: 3,
    })
  })
})

describe('changing a deal', () => {
  it('edits, moves through any stage, and reopens a won deal (rule 10)', async () => {
    const { scope, customer } = await setup()
    const created = await createDeal(scope, deal(customer.id))

    const edited = await updateDeal(
      scope,
      created.id,
      editable(deal(customer.id, { title: 'Redesign v2', value: '99' })),
    )
    expect(edited).toMatchObject({ title: 'Redesign v2', value: 99 })
    expect((await changeDealStage(scope, created.id, 'won')).stage).toBe('won')
    expect((await changeDealStage(scope, created.id, 'qualified')).stage).toBe(
      'qualified',
    )
  })

  it('makes an archived customer’s deals read-only but visible (rule 12)', async () => {
    const { scope, customer } = await setup()
    const created = await createDeal(scope, deal(customer.id))
    await archiveCustomer(scope, customer.id)

    expect((await getDeal(scope, created.id)).customer.isArchived).toBe(true)
    expect(
      (await listCustomerDeals(scope, customer.id)).map((d) => d.id),
    ).toEqual([created.id])
    for (const attempt of [
      () => updateDeal(scope, created.id, editable(deal(customer.id))),
      () => changeDealStage(scope, created.id, 'won'),
      () => deleteDeal(scope, created.id),
    ]) {
      expect(await errorOf(attempt())).toMatchObject({
        code: 'CUSTOMER_ARCHIVED',
      })
    }
  })

  it('deletes a deal (rule 11), and deleting its contact only clears the contact (rule 13)', async () => {
    const { scope, customer } = await setup()
    const contact = await createContact(scope, customer.id, {
      ...EMPTY_CONTACT_FORM,
      firstName: 'Jane',
      lastName: 'Doe',
    })
    const created = await createDeal(
      scope,
      deal(customer.id, { contactId: contact.id }),
    )

    await deleteContact(scope, contact.id)
    expect((await getDeal(scope, created.id)).contact).toBeNull()

    await deleteDeal(scope, created.id)
    expect(await errorOf(getDeal(scope, created.id))).toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

describe('workspace isolation (rule 2)', () => {
  it('treats another workspace’s deals, customers, and contacts as not existing', async () => {
    const a = await setup('A customer')
    const b = await setup('B customer')
    const aContact = await createContact(a.scope, a.customer.id, {
      ...EMPTY_CONTACT_FORM,
      firstName: 'Ann',
      lastName: 'A',
    })
    const aDeal = await createDeal(a.scope, deal(a.customer.id))

    expect(await titles(b.scope)).toEqual([])
    expect(await listBoardDeals(b.scope)).toEqual([])
    for (const attempt of [
      () => getDeal(b.scope, aDeal.id),
      () => updateDeal(b.scope, aDeal.id, editable(deal(b.customer.id))),
      () => changeDealStage(b.scope, aDeal.id, 'won'),
      () => deleteDeal(b.scope, aDeal.id),
      () => listCustomerDeals(b.scope, a.customer.id),
    ]) {
      expect(await errorOf(attempt())).toMatchObject({ code: 'NOT_FOUND' })
    }
    expect(
      await errorOf(createDeal(b.scope, deal(a.customer.id))),
    ).toMatchObject({
      code: 'VALIDATION_FAILED',
      details: { customerId: ['Choose a customer'] },
    })
    expect(
      await errorOf(
        createDeal(b.scope, deal(b.customer.id, { contactId: aContact.id })),
      ),
    ).toMatchObject({ code: 'VALIDATION_FAILED' })
  })
})
