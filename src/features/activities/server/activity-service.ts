import type {
  Activity,
  ActivityPage,
  ActivityScope,
} from '@/features/activities/types/activity'
import type { ActivityFormValues } from '@/features/activities/types/activity-form-schema'
import type {
  ActivityHistoryParams,
  UpdateActivityValues,
} from '@/features/activities/types/activity-inputs'
import type { Prisma } from '@/generated/prisma/client'
import { AppError } from '@/lib/app-error'
import type { TenantScope } from '@/server/tenant-db'

/** Open tasks are shown on their own; this many is far more than a person has. */
const OPEN_TASKS_LIMIT = 200

const ACTIVITY_INCLUDE = {
  customer: { select: { id: true, name: true, status: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  deal: { select: { id: true, title: true } },
} satisfies Prisma.ActivityInclude

type ActivityRow = Prisma.ActivityGetPayload<{
  include: typeof ACTIVITY_INCLUDE
}>

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    type: row.type,
    subject: row.subject,
    notes: row.notes,
    date: row.date.toISOString().slice(0, 10),
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
    deal: row.deal ? { id: row.deal.id, title: row.deal.title } : null,
    done: row.done,
  }
}

function toColumns(values: UpdateActivityValues) {
  return {
    type: values.type,
    subject: values.subject.trim(),
    notes: values.notes.trim() || null,
    date: new Date(`${values.date}T00:00:00Z`),
    contactId: values.contactId || null,
    dealId: values.dealId || null,
  }
}

function scopeWhere(scope: ActivityScope): Prisma.ActivityWhereInput {
  return { customerId: scope.customerId, dealId: scope.dealId }
}

const OPEN_TASK: Prisma.ActivityWhereInput = { type: 'task', done: false }

/** Rule 27: open tasks first, by due date (oldest first). */
export async function listOpenTasks(
  { db }: TenantScope,
  scope: ActivityScope,
): Promise<Activity[]> {
  const rows = await db.activity.findMany({
    where: { ...scopeWhere(scope), ...OPEN_TASK },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    take: OPEN_TASKS_LIMIT,
    include: ACTIVITY_INCLUDE,
  })
  return rows.map(toActivity)
}

/** Rule 27: everything else, newest first, a page at a time. */
export async function listActivityHistory(
  { db }: TenantScope,
  params: ActivityHistoryParams,
): Promise<ActivityPage> {
  const where: Prisma.ActivityWhereInput = {
    ...scopeWhere(params),
    type: params.type,
    NOT: OPEN_TASK,
  }
  const [rows, total] = await Promise.all([
    db.activity.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: ACTIVITY_INCLUDE,
    }),
    db.activity.count({ where }),
  ])
  return {
    items: rows.map(toActivity),
    total,
    page: params.page,
    pageSize: params.pageSize,
  }
}

export async function getActivity(
  { db }: TenantScope,
  activityId: string,
): Promise<Activity> {
  const row = await db.activity.findUnique({
    where: { id: activityId },
    include: ACTIVITY_INCLUDE,
  })
  if (!row) {
    throw activityNotFound()
  }
  return toActivity(row)
}

/** Rules 24–25: an active customer, and its own contact and deal. */
export async function createActivity(
  scope: TenantScope,
  values: ActivityFormValues,
): Promise<Activity> {
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
  await assertBelongsToCustomer(scope, values, values.customerId)
  const row = await scope.db.activity.create({
    data: {
      ...toColumns(values),
      customerId: values.customerId,
      tenantId: scope.tenantId,
    },
    include: ACTIVITY_INCLUDE,
  })
  return toActivity(row)
}

/** Editing keeps a task's done state; changing the type away from task clears it. */
export async function updateActivity(
  scope: TenantScope,
  activityId: string,
  values: UpdateActivityValues,
): Promise<Activity> {
  const current = await scope.db.activity.findUnique({
    where: { id: activityId },
    select: { customerId: true },
  })
  if (!current) {
    throw activityNotFound()
  }
  await assertBelongsToCustomer(scope, values, current.customerId)
  await changeWhileActive(scope, activityId, {
    ...toColumns(values),
    ...(values.type === 'task' ? {} : { done: false }),
  })
  return getActivity(scope, activityId)
}

/** Rule 27: only tasks can be done, as an action of its own. */
export async function setActivityDone(
  scope: TenantScope,
  activityId: string,
  done: boolean,
): Promise<Activity> {
  const { count } = await scope.db.activity.updateMany({
    where: { id: activityId, type: 'task', customer: { status: 'active' } },
    data: { done },
  })
  if (count === 0) {
    const activity = await getActivity(scope, activityId)
    if (activity.type !== 'task') {
      throw invalid('done', 'Only tasks can be marked as done.')
    }
    throw customerArchived()
  }
  return getActivity(scope, activityId)
}

/** Rule 26: permanent, after the UI's confirmation. */
export async function deleteActivity(
  scope: TenantScope,
  activityId: string,
): Promise<void> {
  const { count } = await scope.db.activity.deleteMany({
    where: { id: activityId, customer: { status: 'active' } },
  })
  if (count === 0) {
    throw await whyUnchanged(scope, activityId)
  }
}

async function changeWhileActive(
  scope: TenantScope,
  activityId: string,
  data: Prisma.ActivityUncheckedUpdateManyInput,
): Promise<void> {
  const { count } = await scope.db.activity.updateMany({
    where: { id: activityId, customer: { status: 'active' } },
    data,
  })
  if (count === 0) {
    throw await whyUnchanged(scope, activityId)
  }
}

async function assertBelongsToCustomer(
  scope: TenantScope,
  values: { contactId: string; dealId: string },
  customerId: string,
): Promise<void> {
  if (values.contactId) {
    const contact = await scope.db.contact.findFirst({
      where: { id: values.contactId, customerId },
      select: { id: true },
    })
    if (!contact) {
      throw invalid('contactId', "Choose one of the customer's contacts")
    }
  }
  if (values.dealId) {
    const deal = await scope.db.deal.findFirst({
      where: { id: values.dealId, customerId },
      select: { id: true },
    })
    if (!deal) {
      throw invalid('dealId', "Choose one of the customer's deals")
    }
  }
}

/** A change matched nothing: the activity is gone, or its customer archived. */
async function whyUnchanged(
  scope: TenantScope,
  activityId: string,
): Promise<AppError> {
  const activity = await scope.db.activity.findUnique({
    where: { id: activityId },
    select: { id: true },
  })
  return activity ? customerArchived() : activityNotFound()
}

function invalid(field: string, message: string): AppError {
  return new AppError({
    code: 'VALIDATION_FAILED',
    message,
    details: { [field]: [message] },
  })
}

function activityNotFound(): AppError {
  return new AppError({
    code: 'NOT_FOUND',
    message: 'This activity does not exist.',
  })
}

function customerArchived(): AppError {
  return new AppError({
    code: 'CUSTOMER_ARCHIVED',
    message:
      "This activity's customer is archived. Restore it to change its activities.",
  })
}
