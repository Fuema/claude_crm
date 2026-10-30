import type { Deal } from '@/features/deals/types/deal'
import {
  dealBoardSearchSchema,
  groupDealsByStage,
} from '@/features/deals/types/deal-board'

function deal(overrides: Partial<Deal>): Deal {
  return {
    id: 'deal-1',
    title: 'Deal',
    customer: { id: 'cus-001', name: 'Acme Corporation', isArchived: false },
    contact: null,
    value: 0,
    currency: 'EUR',
    stage: 'lead',
    expectedCloseDate: null,
    ...overrides,
  }
}

describe('groupDealsByStage', () => {
  it('returns every stage in pipeline order, empty ones too', () => {
    const columns = groupDealsByStage([])

    expect(columns.map((column) => column.stage)).toEqual([
      'lead',
      'qualified',
      'proposal',
      'negotiation',
      'won',
      'lost',
    ])
    expect(columns.every((column) => column.deals.length === 0)).toBe(true)
    expect(columns.every((column) => column.totals.length === 0)).toBe(true)
  })

  it('totals each currency on its own and never mixes them', () => {
    const [lead] = groupDealsByStage([
      deal({ id: 'a', value: 100, currency: 'USD' }),
      deal({ id: 'b', value: 250.5, currency: 'EUR' }),
      deal({ id: 'c', value: 49.5, currency: 'EUR' }),
      deal({ id: 'd', value: 10, currency: 'EUR', stage: 'won' }),
    ])

    expect(lead?.deals.map((item) => item.id)).toEqual(['a', 'b', 'c'])
    expect(lead?.totals).toEqual([
      { currency: 'EUR', value: 300 },
      { currency: 'USD', value: 100 },
    ])
  })

  it('adds cents exactly', () => {
    const [lead] = groupDealsByStage([
      deal({ id: 'a', value: 0.1 }),
      deal({ id: 'b', value: 0.2 }),
    ])

    expect(lead?.totals).toEqual([{ currency: 'EUR', value: 0.3 }])
  })
})

describe('dealBoardSearchSchema', () => {
  it('drops an invalid customer instead of failing', () => {
    expect(dealBoardSearchSchema.parse({ customer: '' })).toEqual({})
    expect(dealBoardSearchSchema.parse({ customer: 'cus-001' })).toEqual({
      customer: 'cus-001',
    })
  })
})
