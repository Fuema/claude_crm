import type { Invoice, InvoicePage } from '@/features/invoices/types/invoice'
import type { InvoiceFormValues } from '@/features/invoices/types/invoice-form-schema'
import type {
  InvoiceAction,
  InvoiceListParams,
  UpdateInvoiceValues,
} from '@/features/invoices/types/invoice-inputs'
import { computeInvoiceTotals } from '@/features/invoices/types/invoice-money'
import type { Prisma } from '@/generated/prisma/client'
import { AppError } from '@/lib/app-error'
import type { TenantDb, TenantScope } from '@/server/tenant-db'

const INVOICE_INCLUDE = {
  customer: { select: { id: true, name: true, status: true } },
  deal: { select: { id: true, title: true } },
  lines: { orderBy: { position: 'asc' } },
} satisfies Prisma.InvoiceInclude

type InvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_INCLUDE }>

function toDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

function toInvoice(row: InvoiceRow): Invoice {
  const lines = row.lines.map((line) => ({
    id: line.id,
    description: line.description,
    quantity: line.quantity.toFixed(2),
    unitPrice: line.unitPrice.toFixed(2),
  }))
  const taxRate = row.taxRate.toFixed(2)
  const totals = computeInvoiceTotals(lines, taxRate)
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    customer: {
      id: row.customer.id,
      name: row.customer.name,
      isArchived: row.customer.status === 'archived',
    },
    deal: row.deal,
    currency: row.currency,
    taxRate,
    dueDate: toDate(row.dueDate),
    issuedAt: toDate(row.issuedAt),
    notes: row.notes,
    lines: lines.map((line, index) => ({
      ...line,
      amount: totals.lineAmounts[index] ?? '0.00',
    })),
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
  }
}

/** The invoice's own columns; amount texts go to Decimal columns as strings. */
function toColumns(values: UpdateInvoiceValues) {
  return {
    dealId: values.dealId || null,
    currency: values.currency,
    taxRate: values.taxRate.replace(',', '.'),
    dueDate: values.dueDate ? new Date(`${values.dueDate}T00:00:00Z`) : null,
    notes: values.notes.trim() || null,
  }
}

function toLineRows(
  values: UpdateInvoiceValues,
  invoiceId: string,
  tenantId: string,
) {
  return values.lines.map((line, position) => ({
    tenantId,
    invoiceId,
    position,
    description: line.description.trim(),
    quantity: line.quantity.replace(',', '.'),
    unitPrice: line.unitPrice.replace(',', '.'),
  }))
}

/** Newest first; filtered by status and customer. */
export async function listInvoices(
  { db }: TenantScope,
  params: InvoiceListParams,
): Promise<InvoicePage> {
  const where: Prisma.InvoiceWhereInput = {
    status: params.status,
    customerId: params.customerId,
  }
  const [rows, total] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: INVOICE_INCLUDE,
    }),
    db.invoice.count({ where }),
  ])
  return {
    items: rows.map(toInvoice),
    total,
    page: params.page,
    pageSize: params.pageSize,
  }
}

/** Every invoice of one customer, newest first. */
export async function listCustomerInvoices(
  scope: TenantScope,
  customerId: string,
): Promise<Invoice[]> {
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
  const rows = await scope.db.invoice.findMany({
    where: { customerId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: INVOICE_INCLUDE,
  })
  return rows.map(toInvoice)
}

export async function getInvoice(
  { db }: TenantScope,
  invoiceId: string,
): Promise<Invoice> {
  const row = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: INVOICE_INCLUDE,
  })
  if (!row) {
    throw invoiceNotFound()
  }
  return toInvoice(row)
}

/** A draft for an active customer (rule 32), optionally for a Won deal (rule 31). */
export async function createInvoice(
  scope: TenantScope,
  values: InvoiceFormValues,
): Promise<Invoice> {
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
  await assertWonDealOfCustomer(scope.db, values.dealId, values.customerId)
  const invoiceId = await scope.db.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        ...toColumns(values),
        customerId: values.customerId,
        tenantId: scope.tenantId,
      },
      select: { id: true },
    })
    await tx.invoiceLine.createMany({
      data: toLineRows(values, invoice.id, scope.tenantId),
    })
    return invoice.id
  })
  return getInvoice(scope, invoiceId)
}

/** Rule 28: only a draft, and rule 32: only for an active customer. */
export async function updateInvoice(
  scope: TenantScope,
  invoiceId: string,
  values: UpdateInvoiceValues,
): Promise<Invoice> {
  const current = await scope.db.invoice.findUnique({
    where: { id: invoiceId },
    select: { customerId: true },
  })
  if (!current) {
    throw invoiceNotFound()
  }
  await assertWonDealOfCustomer(scope.db, values.dealId, current.customerId)
  await scope.db.$transaction(async (tx) => {
    const { count } = await tx.invoice.updateMany({
      where: {
        id: invoiceId,
        status: 'draft',
        customer: { status: 'active' },
      },
      data: toColumns(values),
    })
    if (count === 0) {
      throw await whyDraftUnchanged(tx, invoiceId)
    }
    await tx.invoiceLine.deleteMany({ where: { invoiceId } })
    await tx.invoiceLine.createMany({
      data: toLineRows(values, invoiceId, scope.tenantId),
    })
  })
  return getInvoice(scope, invoiceId)
}

/**
 * Rule 30: Send (draft → sent, with a number and issue date), Mark as paid
 * (sent → paid), Void (draft or sent → void). Each change is one statement
 * that only matches the allowed starting state, so concurrent clicks cannot
 * both succeed.
 */
export async function applyInvoiceAction(
  scope: TenantScope,
  invoiceId: string,
  action: InvoiceAction,
  today: Date = new Date(),
): Promise<Invoice> {
  if (action === 'send') {
    await sendInvoice(scope, invoiceId, today)
  } else if (action === 'markPaid') {
    // Rule 32: allowed for an archived customer's sent invoices.
    const { count } = await scope.db.invoice.updateMany({
      where: { id: invoiceId, status: 'sent' },
      data: { status: 'paid' },
    })
    if (count === 0) {
      throw await whyStatusUnchanged(scope.db, invoiceId)
    }
  } else {
    const { count } = await scope.db.invoice.updateMany({
      where: {
        id: invoiceId,
        OR: [
          { status: 'sent' },
          // Rule 32: an archived customer's drafts are read-only.
          { status: 'draft', customer: { status: 'active' } },
        ],
      },
      data: { status: 'void' },
    })
    if (count === 0) {
      throw await whyStatusUnchanged(scope.db, invoiceId)
    }
  }
  return getInvoice(scope, invoiceId)
}

/**
 * Rules 28–29: a draft with lines gets the workspace's next number. The
 * counter changes in the same transaction, so a failed send uses no number.
 */
async function sendInvoice(
  scope: TenantScope,
  invoiceId: string,
  today: Date,
): Promise<void> {
  await scope.db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        status: true,
        customer: { select: { status: true } },
        _count: { select: { lines: true } },
      },
    })
    if (!invoice) {
      throw invoiceNotFound()
    }
    if (invoice.status !== 'draft') {
      throw invalidStatusChange()
    }
    if (invoice.customer.status === 'archived') {
      throw customerArchived()
    }
    if (invoice._count.lines === 0) {
      throw new AppError({
        code: 'INVOICE_HAS_NO_LINES',
        message: 'Add at least one line before sending the invoice.',
      })
    }
    const counter = await tx.invoiceCounter.upsert({
      where: { tenantId: scope.tenantId },
      create: { tenantId: scope.tenantId, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    })
    const { count } = await tx.invoice.updateMany({
      where: { id: invoiceId, status: 'draft' },
      data: {
        status: 'sent',
        number: formatInvoiceNumber(counter.lastNumber),
        sequence: counter.lastNumber,
        issuedAt: new Date(`${today.toISOString().slice(0, 10)}T00:00:00Z`),
      },
    })
    if (count === 0) {
      // Sent by someone else meanwhile; rolling back returns the number.
      throw invalidStatusChange()
    }
  })
}

/** INV-0001, INV-0002, …; more digits once past 9999. */
export function formatInvoiceNumber(sequence: number): string {
  return `INV-${String(sequence).padStart(4, '0')}`
}

async function assertWonDealOfCustomer(
  db: TenantDb,
  dealId: string,
  customerId: string,
): Promise<void> {
  if (!dealId) {
    return
  }
  const deal = await db.deal.findFirst({
    where: { id: dealId, customerId, stage: 'won' },
    select: { id: true },
  })
  if (!deal) {
    throw invalid('dealId', "Choose one of the customer's Won deals")
  }
}

type InvoiceReader = Pick<TenantDb, 'invoice'>

/** A draft change matched nothing: gone, no longer a draft, or archived. */
async function whyDraftUnchanged(
  db: InvoiceReader,
  invoiceId: string,
): Promise<AppError> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true },
  })
  if (!invoice) {
    return invoiceNotFound()
  }
  if (invoice.status !== 'draft') {
    return new AppError({
      code: 'INVOICE_NOT_EDITABLE',
      message: 'Only a draft invoice can be edited.',
    })
  }
  return customerArchived()
}

/** A status change matched nothing: gone, archived draft, or not allowed. */
async function whyStatusUnchanged(
  db: InvoiceReader,
  invoiceId: string,
): Promise<AppError> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true, customer: { select: { status: true } } },
  })
  if (!invoice) {
    return invoiceNotFound()
  }
  if (invoice.status === 'draft' && invoice.customer.status === 'archived') {
    return customerArchived()
  }
  return invalidStatusChange()
}

function invalid(field: string, message: string): AppError {
  return new AppError({
    code: 'VALIDATION_FAILED',
    message,
    details: { [field]: [message] },
  })
}

function invoiceNotFound(): AppError {
  return new AppError({
    code: 'NOT_FOUND',
    message: 'This invoice does not exist.',
  })
}

function invalidStatusChange(): AppError {
  return new AppError({
    code: 'INVALID_STATUS_CHANGE',
    message: 'This invoice cannot change to that status.',
  })
}

function customerArchived(): AppError {
  return new AppError({
    code: 'CUSTOMER_ARCHIVED',
    message:
      "This invoice's customer is archived. Restore it to change its draft invoices.",
  })
}
