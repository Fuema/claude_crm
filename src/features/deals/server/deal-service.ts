import type {
  Currency,
  Deal,
  DealPage,
  DealStage,
} from '@/features/deals/types/deal'
import type { DealFormValues } from '@/features/deals/types/deal-form-schema'
import type { UpdateDealValues } from '@/features/deals/types/deal-inputs'
import type { DealListParams } from '@/features/deals/types/deal-search'
import { Prisma } from '@/generated/prisma/client'
import { AppError } from '@/lib/app-error'
import type { TenantScope } from '@/server/tenant-db'

/** What every deal query loads: the deal plus its customer and contact. */
const DEAL_INCLUDE = {
  customer: { select: { id: true, name: true, status: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.DealInclude

type DealRow = Prisma.DealGetPayload<{ include: typeof DEAL_INCLUDE }>

function toDeal(row: DealRow): Deal {
  return {
    id: row.id,
    title: row.title,
    customer: {
      id: row.customer.id,
      name: row.customer.name,
      isArchived: row.customer.status === 'archived',
    },
    contact: row.contact
      ? {
          id: row.contact.id,
          name: `${row.contact.firstName} ${row.contact.lastName}`,
        }
      : null,
    // At most 999,999,999.99: exact enough as a number for display.
    value: row.value.toNumber(),
    currency: row.currency,
    stage: row.stage,
    expectedCloseDate: row.expectedCloseDate
      ? row.expectedCloseDate.toISOString().slice(0, 10)
      : null,
  }
}

function normalizeTitle(title: string): string {
  return title.trim().toLocaleLowerCase('en')
}

/** The editable columns. The amount text becomes a Decimal, never a float. */
function toColumns(values: UpdateDealValues) {
  return {
    title: values.title.trim(),
    titleNormalized: normalizeTitle(values.title),
    contactId: values.contactId || null,
    value: new Prisma.Decimal(values.value.replace(',', '.')),
    currency: values.currency satisfies Currency,
    stage: values.stage,
    expectedCloseDate: values.expectedCloseDate
      ? new Date(`${values.expectedCloseDate}T00:00:00Z`)
      : null,
  }
}

export async function listDeals(
  { db }: TenantScope,
  params: DealListParams,
): Promise<DealPage> {
  const where: Prisma.DealWhereInput = {
    stage: params.stage,
    customerId: params.customerId,
    ...(params.q
      ? { titleNormalized: { contains: normalizeTitle(params.q) } }
      : {}),
  }
  const direction = params.order ?? 'asc'
  const orderBy: Prisma.DealOrderByWithRelationInput[] =
    params.sort === 'expectedCloseDate'
      ? [
          // Deals without a date sort last, whatever the direction.
          { expectedCloseDate: { sort: direction, nulls: 'last' } },
          { titleNormalized: 'asc' },
          { id: 'asc' },
        ]
      : [{ titleNormalized: direction }, { id: 'asc' }]
  const [rows, total] = await Promise.all([
    db.deal.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: DEAL_INCLUDE,
    }),
    db.deal.count({ where }),
  ])
  return {
    items: rows.map(toDeal),
    total,
    page: params.page,
    pageSize: params.pageSize,
  }
}

/** Every deal of one customer (archived ones included), by title. */
export async function listCustomerDeals(
  scope: TenantScope,
  customerId: string,
): Promise<Deal[]> {
  const customer = await scope.db.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  })
  if (!customer) {
    throw new AppError({
      code: 'NOT_FOUND',
      message: 'This customer does not exist.',
    })
  }
  return listBoardDeals(scope, customerId)
}

/** Every deal (or one customer's) for the pipeline board, by title. */
export async function listBoardDeals(
  { db }: TenantScope,
  customerId?: string,
): Promise<Deal[]> {
  const rows = await db.deal.findMany({
    where: { customerId },
    orderBy: [{ titleNormalized: 'asc' }, { id: 'asc' }],
    include: DEAL_INCLUDE,
  })
  return rows.map(toDeal)
}

export async function getDeal(
  { db }: TenantScope,
  dealId: string,
): Promise<Deal> {
  const row = await db.deal.findUnique({
    where: { id: dealId },
    include: DEAL_INCLUDE,
  })
  if (!row) {
    throw dealNotFound()
  }
  return toDeal(row)
}

/** Rule 12: an active customer; rule 13: a contact of that customer. */
export async function createDeal(
  scope: TenantScope,
  values: DealFormValues,
): Promise<Deal> {
  const customer = await scope.db.customer.findUnique({
    where: { id: values.customerId },
    select: { status: true },
  })
  if (!customer) {
    throw invalid('customerId', 'Choose a customer')
  }
  if (customer.status === 'archived') {
    throw customerArchived()
  }
  await assertContactOfCustomer(scope, values.contactId, values.customerId)
  const row = await scope.db.deal.create({
    data: {
      ...toColumns(values),
      customerId: values.customerId,
      tenantId: scope.tenantId,
    },
    include: DEAL_INCLUDE,
  })
  return toDeal(row)
}

/** Rules 12 and 13: only while the customer is active (same statement). */
export async function updateDeal(
  scope: TenantScope,
  dealId: string,
  values: UpdateDealValues,
): Promise<Deal> {
  const current = await scope.db.deal.findUnique({
    where: { id: dealId },
    select: { customerId: true },
  })
  if (!current) {
    throw dealNotFound()
  }
  await assertContactOfCustomer(scope, values.contactId, current.customerId)
  await changeWhileActive(scope, dealId, toColumns(values))
  return getDeal(scope, dealId)
}

/** Rule 10: any stage to any stage, while the customer is active. */
export async function changeDealStage(
  scope: TenantScope,
  dealId: string,
  stage: DealStage,
): Promise<Deal> {
  await changeWhileActive(scope, dealId, { stage })
  return getDeal(scope, dealId)
}

/** Rule 11: permanent, after the UI's confirmation. */
export async function deleteDeal(
  scope: TenantScope,
  dealId: string,
): Promise<void> {
  const { count } = await scope.db.deal.deleteMany({
    where: { id: dealId, customer: { status: 'active' } },
  })
  if (count === 0) {
    throw await whyUnchanged(scope, dealId)
  }
}

async function changeWhileActive(
  scope: TenantScope,
  dealId: string,
  data: Prisma.DealUncheckedUpdateManyInput,
): Promise<void> {
  const { count } = await scope.db.deal.updateMany({
    where: { id: dealId, customer: { status: 'active' } },
    data,
  })
  if (count === 0) {
    throw await whyUnchanged(scope, dealId)
  }
}

async function assertContactOfCustomer(
  scope: TenantScope,
  contactId: string,
  customerId: string,
): Promise<void> {
  if (!contactId) {
    return
  }
  const contact = await scope.db.contact.findFirst({
    where: { id: contactId, customerId },
    select: { id: true },
  })
  if (!contact) {
    throw invalid('contactId', "Choose one of the customer's contacts")
  }
}

/** A change matched nothing: the deal is gone, or its customer archived. */
async function whyUnchanged(
  scope: TenantScope,
  dealId: string,
): Promise<AppError> {
  const deal = await scope.db.deal.findUnique({
    where: { id: dealId },
    select: { id: true },
  })
  return deal ? customerArchived() : dealNotFound()
}

function invalid(field: string, message: string): AppError {
  return new AppError({
    code: 'VALIDATION_FAILED',
    message,
    details: { [field]: [message] },
  })
}

function dealNotFound(): AppError {
  return new AppError({
    code: 'NOT_FOUND',
    message: 'This deal does not exist.',
  })
}

function customerArchived(): AppError {
  return new AppError({
    code: 'CUSTOMER_ARCHIVED',
    message: "This deal's customer is archived. Restore it to change the deal.",
  })
}
