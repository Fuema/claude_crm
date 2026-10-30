import {
  invoiceSearchSchema,
  toInvoiceListParams,
} from '@/features/invoices/types/invoice-search'

describe('invoiceSearchSchema', () => {
  it('drops invalid values instead of failing', () => {
    expect(
      invoiceSearchSchema.parse({
        page: 0,
        pageSize: 15,
        status: 'overdue',
        customer: '',
      }),
    ).toEqual({})
  })
})

describe('toInvoiceListParams', () => {
  it('shows all invoices on page 1 by default', () => {
    expect(toInvoiceListParams({})).toEqual({
      page: 1,
      pageSize: 10,
      status: undefined,
      customerId: undefined,
    })
  })

  it('maps the customer filter to its id', () => {
    expect(
      toInvoiceListParams({ page: 2, status: 'sent', customer: 'cus-001' }),
    ).toMatchObject({ page: 2, status: 'sent', customerId: 'cus-001' })
  })
})
