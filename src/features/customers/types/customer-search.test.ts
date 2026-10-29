import {
  customerSearchSchema,
  toCustomerListParams,
} from '@/features/customers/types/customer-search'

describe('customerSearchSchema', () => {
  it('drops invalid values instead of failing', () => {
    expect(
      customerSearchSchema.parse({
        page: 0,
        pageSize: 15,
        status: 'deleted',
        sort: 'email',
        order: 'sideways',
      }),
    ).toEqual({})
  })
})

describe('toCustomerListParams', () => {
  it('shows active customers on page 1 by default', () => {
    expect(toCustomerListParams({})).toEqual({
      page: 1,
      pageSize: 10,
      q: '',
      status: 'active',
      sort: undefined,
      order: undefined,
    })
  })

  it('sends no status for "all" and the status for "archived"', () => {
    expect(toCustomerListParams({ status: 'all' }).status).toBeUndefined()
    expect(toCustomerListParams({ status: 'archived' }).status).toBe('archived')
  })

  it('trims the search and defaults the order to ascending', () => {
    expect(toCustomerListParams({ q: '  acme ', sort: 'name' })).toMatchObject({
      q: 'acme',
      sort: 'name',
      order: 'asc',
    })
  })
})
