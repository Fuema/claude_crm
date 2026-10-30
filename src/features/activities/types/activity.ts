import { z } from 'zod'

export const activityTypeSchema = z.enum(['call', 'meeting', 'email', 'task'])

export type ActivityType = z.infer<typeof activityTypeSchema>

export const ACTIVITY_TYPES = activityTypeSchema.options

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: 'Call',
  meeting: 'Meeting',
  email: 'Email',
  task: 'Task',
}

export interface Activity {
  id: string
  type: ActivityType
  subject: string
  notes: string | null
  /** Calendar date "YYYY-MM-DD": when it happened; for a task, when it is due. */
  date: string
  customer: {
    id: string
    name: string
    /** An archived customer's activities are read-only (rule 25). */
    isArchived: boolean
  }
  contact: { id: string; name: string } | null
  deal: { id: string; title: string } | null
  /** Tasks only (rule 27); always false for other types. */
  done: boolean
}

export interface ActivityPage {
  items: Activity[]
  total: number
  page: number
  pageSize: number
}

/** Where a list of activities comes from: everything, a customer, or a deal. */
export interface ActivityScope {
  customerId?: string
  dealId?: string
}

export function isOpenTask(activity: Pick<Activity, 'type' | 'done'>): boolean {
  return activity.type === 'task' && !activity.done
}
