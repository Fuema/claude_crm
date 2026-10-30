import { z } from 'zod'
import { PAGE_SIZE_OPTIONS } from '@/components/data-table'
import { activityTypeSchema } from '@/features/activities/types/activity'

/**
 * The Activities page's URL search params (the history's page, size, and
 * type filter). Invalid values fall back to `undefined`, so a hand-edited URL
 * never breaks the page.
 */
export const activitySearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  pageSize: z.literal(PAGE_SIZE_OPTIONS).optional().catch(undefined),
  type: activityTypeSchema.optional().catch(undefined),
})

export type ActivitySearch = z.infer<typeof activitySearchSchema>

export const DEFAULT_PAGE_SIZE = 10

export function toHistoryState(search: ActivitySearch) {
  return {
    page: search.page ?? 1,
    pageSize: search.pageSize ?? DEFAULT_PAGE_SIZE,
    type: search.type,
  }
}

/** Matches a page size the URL may hold, or undefined for the default. */
export function toPageSizeParam(pageSize: number) {
  return pageSize === DEFAULT_PAGE_SIZE
    ? undefined
    : PAGE_SIZE_OPTIONS.find((size) => size === pageSize)
}
