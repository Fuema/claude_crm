import {
  createActivity,
  deleteActivity,
  getActivity,
  listActivityHistory,
  listOpenTasks,
  setActivityDone,
  updateActivity,
} from '@/features/activities/server/activity-service'
import {
  type ActivityFormValues,
  newActivityFormValues,
} from '@/features/activities/types/activity-form-schema'
import { createContact } from '@/features/contacts/server/contact-service'
import { EMPTY_CONTACT_FORM } from '@/features/contacts/types/contact-form-schema'
import {
  archiveCustomer,
  createCustomer,
} from '@/features/customers/server/customer-service'
import { EMPTY_CUSTOMER_FORM } from '@/features/customers/types/customer-form-schema'
import { createDeal, deleteDeal } from '@/features/deals/server/deal-service'
import { EMPTY_DEAL_FORM } from '@/features/deals/types/deal-form-schema'
import { isAppError } from '@/lib/app-error'
import { getDb } from '@/server/db'
import type { TenantScope } from '@/server/tenant-db'
import { createTestWorkspace } from '@/tests/factories/workspace'

const db = getDb()

async function setup(customerName = 'Acme') {
  const scope = await createTestWorkspace(db)
  const customer = await createCustomer(scope, {
    ...EMPTY_CUSTOMER_FORM,
    name: customerName,
  })
  return { scope, customer }
}

function activity(
  customerId: string,
  overrides: Partial<ActivityFormValues> = {},
): ActivityFormValues {
  return {
    ...newActivityFormValues('2026-10-01', { customerId }),
    subject: 'Intro call',
    ...overrides,
  }
}

function editable({ customerId: _, ...values }: ActivityFormValues) {
  return values
}

async function errorOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  )
  return isAppError(error) ? error.toJSON() : error
}

async function history(scope: TenantScope, customerId?: string) {
  const page = await listActivityHistory(scope, {
    customerId,
    page: 1,
    pageSize: 10,
  })
  return page.items.map((item) => item.subject)
}

async function openTasks(scope: TenantScope, customerId?: string) {
  return (await listOpenTasks(scope, { customerId })).map((t) => t.subject)
}

describe('listing activities (rule 27)', () => {
  it('shows open tasks by due date, and everything else newest first', async () => {
    const { scope, customer } = await setup()
    const id = customer.id
    await createActivity(
      scope,
      activity(id, { subject: 'Old call', date: '2026-01-01' }),
    )
    await createActivity(
      scope,
      activity(id, {
        subject: 'Recent email',
        type: 'email',
        date: '2026-09-01',
      }),
    )
    await createActivity(
      scope,
      activity(id, { subject: 'Later task', type: 'task', date: '2026-12-01' }),
    )
    await createActivity(
      scope,
      activity(id, {
        subject: 'Overdue task',
        type: 'task',
        date: '2026-02-01',
      }),
    )
    const finished = await createActivity(
      scope,
      activity(id, {
        subject: 'Finished task',
        type: 'task',
        date: '2026-05-01',
      }),
    )
    await setActivityDone(scope, finished.id, true)

    expect(await openTasks(scope)).toEqual(['Overdue task', 'Later task'])
    expect(await history(scope)).toEqual([
      'Recent email',
      'Finished task',
      'Old call',
    ])
  })

  it('narrows to one customer or one deal', async () => {
    const { scope, customer } = await setup()
    const other = await createCustomer(scope, {
      ...EMPTY_CUSTOMER_FORM,
      name: 'Other',
    })
    const deal = await createDeal(scope, {
      ...EMPTY_DEAL_FORM,
      title: 'Big deal',
      customerId: customer.id,
      value: '100',
    })
    await createActivity(
      scope,
      activity(customer.id, { subject: 'On the deal', dealId: deal.id }),
    )
    await createActivity(
      scope,
      activity(customer.id, { subject: 'On the customer' }),
    )
    await createActivity(scope, activity(other.id, { subject: 'Elsewhere' }))

    expect(await history(scope, customer.id)).toHaveLength(2)
    const onDeal = await listActivityHistory(scope, {
      dealId: deal.id,
      page: 1,
      pageSize: 10,
    })
    expect(onDeal.items.map((a) => a.subject)).toEqual(['On the deal'])
  })
})

describe('creating and changing activities', () => {
  it('links a contact and a deal only of the same customer (rule 24)', async () => {
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
    const otherDeal = await createDeal(scope, {
      ...EMPTY_DEAL_FORM,
      title: 'Not theirs',
      customerId: other.id,
      value: '1',
    })

    expect(
      await errorOf(
        createActivity(
          scope,
          activity(customer.id, { contactId: otherContact.id }),
        ),
      ),
    ).toMatchObject({
      code: 'VALIDATION_FAILED',
      details: { contactId: expect.any(Array) },
    })
    expect(
      await errorOf(
        createActivity(scope, activity(customer.id, { dealId: otherDeal.id })),
      ),
    ).toMatchObject({
      code: 'VALIDATION_FAILED',
      details: { dealId: expect.any(Array) },
    })
  })

  it('marks only tasks as done, and clears done when a task becomes a call', async () => {
    const { scope, customer } = await setup()
    const call = await createActivity(scope, activity(customer.id))
    expect(await errorOf(setActivityDone(scope, call.id, true))).toMatchObject({
      code: 'VALIDATION_FAILED',
    })

    const task = await createActivity(
      scope,
      activity(customer.id, { type: 'task' }),
    )
    expect((await setActivityDone(scope, task.id, true)).done).toBe(true)
    expect((await setActivityDone(scope, task.id, false)).done).toBe(false)
    await setActivityDone(scope, task.id, true)
    const asCall = await updateActivity(
      scope,
      task.id,
      editable(activity(customer.id, { type: 'call' })),
    )
    expect(asCall).toMatchObject({ type: 'call', done: false })
  })

  it('deletes an activity, and deleting its deal only clears the link (rules 26)', async () => {
    const { scope, customer } = await setup()
    const deal = await createDeal(scope, {
      ...EMPTY_DEAL_FORM,
      title: 'Big deal',
      customerId: customer.id,
      value: '100',
    })
    const created = await createActivity(
      scope,
      activity(customer.id, { dealId: deal.id }),
    )

    await deleteDeal(scope, deal.id)
    expect((await getActivity(scope, created.id)).deal).toBeNull()

    await deleteActivity(scope, created.id)
    expect(await errorOf(getActivity(scope, created.id))).toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('makes an archived customer’s activities read-only but visible (rule 25)', async () => {
    const { scope, customer } = await setup()
    const task = await createActivity(
      scope,
      activity(customer.id, { type: 'task' }),
    )
    await archiveCustomer(scope, customer.id)

    expect(await openTasks(scope, customer.id)).toEqual(['Intro call'])
    for (const attempt of [
      () => createActivity(scope, activity(customer.id)),
      () => updateActivity(scope, task.id, editable(activity(customer.id))),
      () => setActivityDone(scope, task.id, true),
      () => deleteActivity(scope, task.id),
    ]) {
      expect(await errorOf(attempt())).toMatchObject({
        code: 'CUSTOMER_ARCHIVED',
      })
    }
  })
})

describe('workspace isolation (rule 2)', () => {
  it('treats another workspace’s activities and customers as not existing', async () => {
    const a = await setup('A customer')
    const b = await setup('B customer')
    const aTask = await createActivity(
      a.scope,
      activity(a.customer.id, { type: 'task' }),
    )

    expect(await openTasks(b.scope)).toEqual([])
    expect(await history(b.scope)).toEqual([])
    for (const attempt of [
      () => getActivity(b.scope, aTask.id),
      () =>
        updateActivity(b.scope, aTask.id, editable(activity(b.customer.id))),
      () => setActivityDone(b.scope, aTask.id, true),
      () => deleteActivity(b.scope, aTask.id),
    ]) {
      expect(await errorOf(attempt())).toMatchObject({ code: 'NOT_FOUND' })
    }
    expect(
      await errorOf(createActivity(b.scope, activity(a.customer.id))),
    ).toMatchObject({ code: 'VALIDATION_FAILED' })
  })
})
