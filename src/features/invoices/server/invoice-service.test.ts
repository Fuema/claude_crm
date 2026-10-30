import {
  archiveCustomer,
  createCustomer,
} from '@/features/customers/server/customer-service'
import { EMPTY_CUSTOMER_FORM } from '@/features/customers/types/customer-form-schema'
import {
  changeDealStage,
  createDeal,
  deleteDeal,
} from '@/features/deals/server/deal-service'
import { EMPTY_DEAL_FORM } from '@/features/deals/types/deal-form-schema'
import {
  applyInvoiceAction,
  createInvoice,
  formatInvoiceNumber,
  getInvoice,
  listCustomerInvoices,
  listInvoices,
  updateInvoice,
} from '@/features/invoices/server/invoice-service'
import {
  type InvoiceFormValues,
  newInvoiceFormValues,
} from '@/features/invoices/types/invoice-form-schema'
import { isAppError } from '@/lib/app-error'
import { getDb } from '@/server/db'
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

function invoice(
  customerId: string,
  overrides: Partial<InvoiceFormValues> = {},
): InvoiceFormValues {
  return {
    ...newInvoiceFormValues(customerId),
    taxRate: '19',
    lines: [
      { description: 'Consulting', quantity: '2', unitPrice: '50.02' },
      { description: 'Travel', quantity: '1', unitPrice: '0,05' },
    ],
    ...overrides,
  }
}

function editable({ customerId: _, ...values }: InvoiceFormValues) {
  return values
}

async function errorOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  )
  return isAppError(error) ? error.toJSON() : error
}

describe('drafts', () => {
  it('stores the lines in order and computes exact totals', async () => {
    const { scope, customer } = await setup()
    const created = await createInvoice(scope, invoice(customer.id))

    expect(created).toMatchObject({
      number: null,
      status: 'draft',
      currency: 'EUR',
      taxRate: '19.00',
      issuedAt: null,
      subtotal: '100.09',
      tax: '19.02',
      total: '119.11',
    })
    expect(
      created.lines.map((line) => [
        line.description,
        line.quantity,
        line.amount,
      ]),
    ).toEqual([
      ['Consulting', '2.00', '100.04'],
      ['Travel', '1.00', '0.05'],
    ])
  })

  it('replaces the lines when a draft is edited', async () => {
    const { scope, customer } = await setup()
    const created = await createInvoice(scope, invoice(customer.id))
    const edited = await updateInvoice(
      scope,
      created.id,
      editable(
        invoice(customer.id, {
          taxRate: '0',
          lines: [
            { description: 'Workshop', quantity: '1', unitPrice: '1200' },
          ],
        }),
      ),
    )
    expect(edited.lines.map((line) => line.description)).toEqual(['Workshop'])
    expect(edited.total).toBe('1200.00')
  })

  it('accepts only a Won deal of the same customer (rule 31)', async () => {
    const { scope, customer } = await setup()
    const deal = await createDeal(scope, {
      ...EMPTY_DEAL_FORM,
      title: 'Big deal',
      customerId: customer.id,
      value: '1000',
    })

    expect(
      await errorOf(
        createInvoice(scope, invoice(customer.id, { dealId: deal.id })),
      ),
    ).toMatchObject({
      code: 'VALIDATION_FAILED',
      details: { dealId: expect.any(Array) },
    })

    await changeDealStage(scope, deal.id, 'won')
    const created = await createInvoice(
      scope,
      invoice(customer.id, { dealId: deal.id }),
    )
    expect(created.deal).toEqual({ id: deal.id, title: 'Big deal' })

    // Deleting the deal keeps the invoice and its lines.
    await deleteDeal(scope, deal.id)
    const after = await getInvoice(scope, created.id)
    expect(after.deal).toBeNull()
    expect(after.lines).toHaveLength(2)
  })
})

describe('status changes (rules 28–30)', () => {
  it('sends with sequential numbers and the issue date, then marks as paid', async () => {
    const { scope, customer } = await setup()
    const first = await createInvoice(scope, invoice(customer.id))
    const second = await createInvoice(scope, invoice(customer.id))
    const today = new Date('2026-10-30T15:00:00Z')

    const sentFirst = await applyInvoiceAction(scope, first.id, 'send', today)
    const sentSecond = await applyInvoiceAction(scope, second.id, 'send', today)
    expect(sentFirst).toMatchObject({
      status: 'sent',
      number: 'INV-0001',
      issuedAt: '2026-10-30',
    })
    expect(sentSecond.number).toBe('INV-0002')

    expect((await applyInvoiceAction(scope, first.id, 'markPaid')).status).toBe(
      'paid',
    )
  })

  it('needs a line to send, and only drafts can be edited', async () => {
    const { scope, customer } = await setup()
    const empty = await createInvoice(
      scope,
      invoice(customer.id, { lines: [] }),
    )
    expect(
      await errorOf(applyInvoiceAction(scope, empty.id, 'send')),
    ).toMatchObject({
      code: 'INVOICE_HAS_NO_LINES',
    })

    const sent = await createInvoice(scope, invoice(customer.id))
    await applyInvoiceAction(scope, sent.id, 'send')
    expect(
      await errorOf(
        updateInvoice(scope, sent.id, editable(invoice(customer.id))),
      ),
    ).toMatchObject({ code: 'INVOICE_NOT_EDITABLE' })
  })

  it('refuses every change rule 30 does not list', async () => {
    const { scope, customer } = await setup()
    const draft = await createInvoice(scope, invoice(customer.id))
    expect(
      await errorOf(applyInvoiceAction(scope, draft.id, 'markPaid')),
    ).toMatchObject({
      code: 'INVALID_STATUS_CHANGE',
    })

    await applyInvoiceAction(scope, draft.id, 'send')
    expect(
      await errorOf(applyInvoiceAction(scope, draft.id, 'send')),
    ).toMatchObject({
      code: 'INVALID_STATUS_CHANGE',
    })
    await applyInvoiceAction(scope, draft.id, 'markPaid')
    expect(
      await errorOf(applyInvoiceAction(scope, draft.id, 'void')),
    ).toMatchObject({
      code: 'INVALID_STATUS_CHANGE',
    })
  })

  it('voids a draft (no number) or a sent invoice, and never reuses a number', async () => {
    const { scope, customer } = await setup()
    const draft = await createInvoice(scope, invoice(customer.id))
    expect(await applyInvoiceAction(scope, draft.id, 'void')).toMatchObject({
      status: 'void',
      number: null,
    })

    const sent = await createInvoice(scope, invoice(customer.id))
    await applyInvoiceAction(scope, sent.id, 'send')
    expect((await applyInvoiceAction(scope, sent.id, 'void')).number).toBe(
      'INV-0001',
    )
    const next = await createInvoice(scope, invoice(customer.id))
    expect((await applyInvoiceAction(scope, next.id, 'send')).number).toBe(
      'INV-0002',
    )
  })

  it('gives exactly one number when the same draft is sent twice at once', async () => {
    const { scope, customer } = await setup()
    const draft = await createInvoice(scope, invoice(customer.id))

    const results = await Promise.allSettled([
      applyInvoiceAction(scope, draft.id, 'send'),
      applyInvoiceAction(scope, draft.id, 'send'),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)

    const next = await createInvoice(scope, invoice(customer.id))
    expect((await applyInvoiceAction(scope, next.id, 'send')).number).toBe(
      'INV-0002',
    )
  })
})

describe('archived customers (rule 32)', () => {
  it('blocks new invoices and drafts, but sent invoices can still be paid or voided', async () => {
    const { scope, customer } = await setup()
    const draft = await createInvoice(scope, invoice(customer.id))
    const toPay = await createInvoice(scope, invoice(customer.id))
    const toVoid = await createInvoice(scope, invoice(customer.id))
    await applyInvoiceAction(scope, toPay.id, 'send')
    await applyInvoiceAction(scope, toVoid.id, 'send')
    await archiveCustomer(scope, customer.id)

    for (const attempt of [
      () => createInvoice(scope, invoice(customer.id)),
      () => updateInvoice(scope, draft.id, editable(invoice(customer.id))),
      () => applyInvoiceAction(scope, draft.id, 'send'),
      () => applyInvoiceAction(scope, draft.id, 'void'),
    ]) {
      expect(await errorOf(attempt())).toMatchObject({
        code: 'CUSTOMER_ARCHIVED',
      })
    }
    expect((await applyInvoiceAction(scope, toPay.id, 'markPaid')).status).toBe(
      'paid',
    )
    expect((await applyInvoiceAction(scope, toVoid.id, 'void')).status).toBe(
      'void',
    )
  })
})

describe('lists', () => {
  it('lists newest first, filtered by status and customer', async () => {
    const { scope, customer } = await setup()
    const other = await createCustomer(scope, {
      ...EMPTY_CUSTOMER_FORM,
      name: 'Other',
    })
    const first = await createInvoice(scope, invoice(customer.id))
    const second = await createInvoice(scope, invoice(customer.id))
    const elsewhere = await createInvoice(scope, invoice(other.id))
    await applyInvoiceAction(scope, first.id, 'send')

    const all = await listInvoices(scope, { page: 1, pageSize: 10 })
    expect(all.items.map((i) => i.id)).toEqual([
      elsewhere.id,
      second.id,
      first.id,
    ])
    const sent = await listInvoices(scope, {
      page: 1,
      pageSize: 10,
      status: 'sent',
    })
    expect(sent.items.map((i) => i.id)).toEqual([first.id])
    expect(
      (await listCustomerInvoices(scope, customer.id)).map((i) => i.id),
    ).toEqual([second.id, first.id])
  })
})

describe('workspace isolation (rule 2)', () => {
  it('keeps invoices, lines, and numbers per workspace', async () => {
    const a = await setup('A customer')
    const b = await setup('B customer')
    const aInvoice = await createInvoice(a.scope, invoice(a.customer.id))
    await applyInvoiceAction(a.scope, aInvoice.id, 'send')

    expect(
      (await listInvoices(b.scope, { page: 1, pageSize: 10 })).items,
    ).toEqual([])
    for (const attempt of [
      () => getInvoice(b.scope, aInvoice.id),
      () =>
        updateInvoice(b.scope, aInvoice.id, editable(invoice(b.customer.id))),
      () => applyInvoiceAction(b.scope, aInvoice.id, 'markPaid'),
      () => listCustomerInvoices(b.scope, a.customer.id),
    ]) {
      expect(await errorOf(attempt())).toMatchObject({ code: 'NOT_FOUND' })
    }
    expect(
      await errorOf(createInvoice(b.scope, invoice(a.customer.id))),
    ).toMatchObject({ code: 'VALIDATION_FAILED' })

    // B's numbering starts at 1, whatever A has used.
    const bInvoice = await createInvoice(b.scope, invoice(b.customer.id))
    expect(
      (await applyInvoiceAction(b.scope, bInvoice.id, 'send')).number,
    ).toBe('INV-0001')
  })
})

describe('formatInvoiceNumber', () => {
  it('pads to four digits and grows beyond', () => {
    expect(formatInvoiceNumber(7)).toBe('INV-0007')
    expect(formatInvoiceNumber(12345)).toBe('INV-12345')
  })
})
