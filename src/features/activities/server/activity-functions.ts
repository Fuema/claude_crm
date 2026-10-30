import { createServerFn } from '@tanstack/react-start'
import {
  createActivity,
  deleteActivity,
  listActivityHistory,
  listOpenTasks,
  setActivityDone,
  updateActivity,
} from '@/features/activities/server/activity-service'
import {
  activityHistorySchema,
  activityIdSchema,
  createActivitySchema,
  openTasksSchema,
  setActivityDoneSchema,
  updateActivitySchema,
} from '@/features/activities/types/activity-inputs'
import { tenantMiddleware } from '@/server/middleware/auth'
import { validateInput } from '@/server/validate'

export const fetchOpenTasks = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .validator(validateInput(openTasksSchema))
  .handler(({ data, context }) => listOpenTasks(context.tenant, data))

export const fetchActivityHistory = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .validator(validateInput(activityHistorySchema))
  .handler(({ data, context }) => listActivityHistory(context.tenant, data))

export const createActivityFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(createActivitySchema))
  .handler(({ data, context }) => createActivity(context.tenant, data))

export const updateActivityFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(updateActivitySchema))
  .handler(({ data, context }) => {
    const { activityId, ...values } = data
    return updateActivity(context.tenant, activityId, values)
  })

export const setActivityDoneFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(setActivityDoneSchema))
  .handler(({ data, context }) =>
    setActivityDone(context.tenant, data.activityId, data.done),
  )

export const deleteActivityFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(activityIdSchema))
  .handler(({ data, context }) =>
    deleteActivity(context.tenant, data.activityId),
  )
