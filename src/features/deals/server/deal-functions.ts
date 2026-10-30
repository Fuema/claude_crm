import { createServerFn } from '@tanstack/react-start'
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
  boardDealsSchema,
  changeDealStageSchema,
  createDealSchema,
  customerDealsSchema,
  dealIdSchema,
  listDealsSchema,
  updateDealSchema,
} from '@/features/deals/types/deal-inputs'
import { tenantMiddleware } from '@/server/middleware/auth'
import { validateInput } from '@/server/validate'

export const fetchDeals = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .validator(validateInput(listDealsSchema))
  .handler(({ data, context }) => listDeals(context.tenant, data))

export const fetchCustomerDeals = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .validator(validateInput(customerDealsSchema))
  .handler(({ data, context }) =>
    listCustomerDeals(context.tenant, data.customerId),
  )

export const fetchBoardDeals = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .validator(validateInput(boardDealsSchema))
  .handler(({ data, context }) =>
    listBoardDeals(context.tenant, data.customerId),
  )

export const fetchDeal = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .validator(validateInput(dealIdSchema))
  .handler(({ data, context }) => getDeal(context.tenant, data.dealId))

export const createDealFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(createDealSchema))
  .handler(({ data, context }) => createDeal(context.tenant, data))

export const updateDealFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(updateDealSchema))
  .handler(({ data, context }) => {
    const { dealId, ...values } = data
    return updateDeal(context.tenant, dealId, values)
  })

export const changeDealStageFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(changeDealStageSchema))
  .handler(({ data, context }) =>
    changeDealStage(context.tenant, data.dealId, data.stage),
  )

export const deleteDealFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(dealIdSchema))
  .handler(({ data, context }) => deleteDeal(context.tenant, data.dealId))
