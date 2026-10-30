import { z } from 'zod'
import { PAGE_SIZE_OPTIONS } from '@/components/data-table'
import { activityTypeSchema } from '@/features/activities/types/activity'
import { activityFormSchema } from '@/features/activities/types/activity-form-schema'

// Server-function inputs, built from the form schema so the browser and the
// server validate the same rules.

const scopeFields = {
  customerId: z.string().min(1).optional(),
  dealId: z.string().min(1).optional(),
}

export const openTasksSchema = z.object(scopeFields)

export const activityHistorySchema = z.object({
  ...scopeFields,
  type: activityTypeSchema.optional(),
  page: z.number().int().min(1),
  pageSize: z.literal(PAGE_SIZE_OPTIONS),
})

export type ActivityHistoryParams = z.infer<typeof activityHistorySchema>

export const activityIdSchema = z.object({ activityId: z.string().min(1) })

export const createActivitySchema = activityFormSchema

/** The customer is fixed after create (rule 24), so it is not sent. */
export const updateActivitySchema = activityFormSchema
  .omit({ customerId: true })
  .extend({ activityId: z.string().min(1) })

export type UpdateActivityValues = Omit<
  z.infer<typeof updateActivitySchema>,
  'activityId'
>

export const setActivityDoneSchema = z.object({
  activityId: z.string().min(1),
  done: z.boolean(),
})
