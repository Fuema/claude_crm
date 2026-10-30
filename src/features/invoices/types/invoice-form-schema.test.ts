import type { Invoice } from '@/features/invoices/types/invoice'
import {
  type InvoiceFormValues,
  type InvoiceLineValues,
  invoiceFormSchema,
  MAX_INVOICE_LINES,
  newInvoiceFormValues,
  toInvoiceFormValues,
} from '@/features/invoices/types/invoice-form-schema'

const LINE: InvoiceLineValues = {
  description: 'Sensors',
  quantity: '2',
  unitPrice: '125.50',
}

const VALID: InvoiceFormValues = {
  ...newInvoiceFormValues('cus-001'),
  lines: [LINE],
}

function errorsFor(values: InvoiceFormValues): Record<string, string> {
  const result = invoiceFormSchema.safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  )
}

describe('invoiceFormSchema', () => {
  it('accepts a customer and one line with the defaults', () => {
    expect(errorsFor(VALID)).toEqual({})
    expect(newInvoiceFormValues()).toMatchObject({
      currency: 'EUR',
      taxRate: '0',
      lines: [{ description: '', quantity: '1', unitPrice: '' }],
    })
  })

  it('accepts a draft without lines (rule 28: only sending needs one)', () => {
    expect(errorsFor({ ...VALID, lines: [] })).toEqual({})
  })

  it('requires a customer and a complete line', () => {
    expect(errorsFor(newInvoiceFormValues())).toEqual({
      customerId: 'Choose a customer',
      'lines.0.description': 'Enter a description',
      'lines.0.unitPrice':
        'Enter an amount up to 999999999.99, digits only, with at most 2 decimals',
    })
  })

  it('rejects a quantity of 0', () => {
    const lines = [{ ...LINE, quantity: '0' }]
    expect(errorsFor({ ...VALID, lines })).toEqual({
      'lines.0.quantity': 'Enter more than 0',
    })
  })

  it.each(['0', '20', '7.5', '100'])('accepts the tax rate %s', (taxRate) => {
    expect(errorsFor({ ...VALID, taxRate })).toEqual({})
  })

  it.each(['-1', '100.01', '101', '7.555', 'abc'])(
    'rejects the tax rate %s',
    (taxRate) => {
      expect(errorsFor({ ...VALID, taxRate })).toEqual({
        taxRate: 'Enter a rate from 0 to 100, with at most 2 decimals',
      })
    },
  )

  it('rejects an invalid due date but allows none', () => {
    expect(errorsFor({ ...VALID, dueDate: '' })).toEqual({})
    expect(errorsFor({ ...VALID, dueDate: '31/12/2026' })).toEqual({
      dueDate: 'Enter a valid date',
    })
  })

  it(`allows at most ${MAX_INVOICE_LINES} lines`, () => {
    const lines = Array.from({ length: MAX_INVOICE_LINES + 1 }, () => LINE)
    expect(errorsFor({ ...VALID, lines })).toEqual({
      lines: `Use at most ${MAX_INVOICE_LINES} lines`,
    })
  })
})

describe('toInvoiceFormValues', () => {
  it('fills the form from a draft and trims zero cents', () => {
    const invoice: Invoice = {
      id: 'inv-001',
      number: null,
      status: 'draft',
      customer: { id: 'cus-001', name: 'Acme', isArchived: false },
      deal: null,
      currency: 'USD',
      taxRate: '20.00',
      dueDate: null,
      issuedAt: null,
      notes: null,
      lines: [
        {
          id: 'line-1',
          description: 'Sensors',
          quantity: '2.00',
          unitPrice: '19.50',
          amount: '39.00',
        },
      ],
      subtotal: '39.00',
      tax: '7.80',
      total: '46.80',
    }
    expect(toInvoiceFormValues(invoice)).toEqual({
      customerId: 'cus-001',
      dealId: '',
      currency: 'USD',
      taxRate: '20',
      dueDate: '',
      notes: '',
      lines: [{ description: 'Sensors', quantity: '2', unitPrice: '19.50' }],
    })
  })
})
