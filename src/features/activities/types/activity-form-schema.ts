import { z } from 'zod'
import {
  type Activity,
  activityTypeSchema,
} from '@/features/activities/types/activity'

export const SUBJECT_MAX_LENGTH = 200
export const NOTES_MAX_LENGTH = 5000

/**
 * Create and edit form. Rules come from docs/project.md (Section 4,
 * Activity, and rules 24–27). An empty contact or deal is sent as "".
 */
export const activityFormSchema = z.object({
  type: activityTypeSchema,
  subject: z
    .string()
    .trim()
    .min(1, 'Enter a subject')
    .max(SUBJECT_MAX_LENGTH, `Use at most ${SUBJECT_MAX_LENGTH} characters`),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date'),
  customerId: z.string().min(1, 'Choose a customer'),
  contactId: z.string(),
  dealId: z.string(),
  notes: z
    .string()
    .trim()
    .max(NOTES_MAX_LENGTH, `Use at most ${NOTES_MAX_LENGTH} characters`),
})

export type ActivityFormValues = z.infer<typeof activityFormSchema>

/** A new activity: a call today, for `customerId` (and `dealId`) when given. */
export function newActivityFormValues(
  today: string,
  scope: { customerId?: string; dealId?: string } = {},
): ActivityFormValues {
  return {
    type: 'call',
    subject: '',
    date: today,
    customerId: scope.customerId ?? '',
    contactId: '',
    dealId: scope.dealId ?? '',
    notes: '',
  }
}

/** The form's values for editing an existing activity. */
export function toActivityFormValues(activity: Activity): ActivityFormValues {
  return {
    type: activity.type,
    subject: activity.subject,
    date: activity.date,
    customerId: activity.customer.id,
    contactId: activity.contact?.id ?? '',
    dealId: activity.deal?.id ?? '',
    notes: activity.notes ?? '',
  }
}
