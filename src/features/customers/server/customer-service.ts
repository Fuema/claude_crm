import type {
  Customer,
  CustomerPage,
} from '@/features/customers/types/customer'
import type { CustomerFormValues } from '@/features/customers/types/customer-form-schema'
import type { CustomerListParams } from '@/features/customers/types/customer-search'
import { Prisma } from '@/generated/prisma/client'
import { AppError } from '@/lib/app-error'
import type { TenantScope } from '@/server/tenant-db'

const NAME_TAKEN_MESSAGE = 'A customer with this name already exists.'

interface CustomerRow {
  id: string
  name: string
  industry: string | null
  website: string | null
  email: string | null
  phone: string | null
  address: string | null
  status: 'active' | 'archived'
}

/** The model the client sees: no tenantId, no normalized name. */
function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    website: row.website,
    email: row.email,
    phone: row.phone,
    address: row.address,
    status: row.status,
  }
}

/** Rule 6: names are unique per workspace, ignoring case and outer spaces. */
export function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('en')
}

/** Empty optional fields are stored as null. */
function toColumns(values: CustomerFormValues) {
  const orNull = (value: string) => value.trim() || null
  return {
    name: values.name.trim(),
    nameNormalized: normalizeName(values.name),
    industry: orNull(values.industry),
    website: orNull(values.website),
    email: orNull(values.email),
    phone: orNull(values.phone),
    address: orNull(values.address),
  }
}

export async function listCustomers(
  { db }: TenantScope,
  params: CustomerListParams,
): Promise<CustomerPage> {
  const where: Prisma.CustomerWhereInput = {
    status: params.status,
    ...(params.q
      ? { nameNormalized: { contains: normalizeName(params.q) } }
      : {}),
  }
  const direction = params.order ?? 'asc'
  const [items, total] = await Promise.all([
    db.customer.findMany({
      where,
      // Default order and the only sort: name (rule from docs/project.md).
      orderBy: [{ nameNormalized: direction }, { id: 'asc' }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    db.customer.count({ where }),
  ])
  return {
    items: items.map(toCustomer),
    total,
    page: params.page,
    pageSize: params.pageSize,
  }
}

export async function getCustomer(
  { db }: TenantScope,
  customerId: string,
): Promise<Customer> {
  const row = await db.customer.findUnique({ where: { id: customerId } })
  if (!row) {
    throw notFound()
  }
  return toCustomer(row)
}

export async function createCustomer(
  { db, tenantId }: TenantScope,
  values: CustomerFormValues,
): Promise<Customer> {
  try {
    const row = await db.customer.create({
      data: { ...toColumns(values), tenantId },
    })
    return toCustomer(row)
  } catch (error) {
    throw mapUniqueName(error)
  }
}

/** Rule 5: an archived customer is read-only until restored. */
export async function updateCustomer(
  scope: TenantScope,
  customerId: string,
  values: CustomerFormValues,
): Promise<Customer> {
  let updated: number
  try {
    // Only an active customer changes, checked in the same statement.
    ;({ count: updated } = await scope.db.customer.updateMany({
      where: { id: customerId, status: 'active' },
      data: toColumns(values),
    }))
  } catch (error) {
    throw mapUniqueName(error)
  }
  if (updated === 0) {
    const current = await getCustomer(scope, customerId)
    if (current.status === 'archived') {
      throw new AppError({
        code: 'CUSTOMER_ARCHIVED',
        message: 'This customer is archived. Restore it to make changes.',
      })
    }
  }
  return getCustomer(scope, customerId)
}

/** Rule 4: customers are archived, never deleted. Archiving twice is fine. */
export function archiveCustomer(
  scope: TenantScope,
  customerId: string,
): Promise<Customer> {
  return setStatus(scope, customerId, 'archived')
}

export function restoreCustomer(
  scope: TenantScope,
  customerId: string,
): Promise<Customer> {
  return setStatus(scope, customerId, 'active')
}

async function setStatus(
  scope: TenantScope,
  customerId: string,
  status: 'active' | 'archived',
): Promise<Customer> {
  const { count } = await scope.db.customer.updateMany({
    where: { id: customerId },
    data: { status },
  })
  if (count === 0) {
    throw notFound()
  }
  return getCustomer(scope, customerId)
}

function notFound(): AppError {
  return new AppError({
    code: 'NOT_FOUND',
    message: 'This customer does not exist.',
  })
}

function mapUniqueName(error: unknown): unknown {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return new AppError(
      {
        code: 'NAME_TAKEN',
        message: NAME_TAKEN_MESSAGE,
        details: { name: [NAME_TAKEN_MESSAGE] },
      },
      { cause: error },
    )
  }
  return error
}
