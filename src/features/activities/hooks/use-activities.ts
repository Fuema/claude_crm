import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import {
  createActivityFn,
  deleteActivityFn,
  fetchActivityHistory,
  fetchOpenTasks,
  setActivityDoneFn,
  updateActivityFn,
} from '@/features/activities/server/activity-functions'
import type {
  Activity,
  ActivityScope,
} from '@/features/activities/types/activity'
import type { ActivityFormValues } from '@/features/activities/types/activity-form-schema'
import type { ActivityHistoryParams } from '@/features/activities/types/activity-inputs'
import { useWorkspaceId } from '@/hooks/use-workspace-id'
import { isAppError } from '@/lib/app-error'
import { workspaceKey } from '@/lib/query-keys'

/** Keys start with the workspace id (docs/data-and-api.md). */
export const activityKeys = {
  all: (tenantId: string) => [...workspaceKey(tenantId), 'activities'] as const,
  openTasks: (tenantId: string, scope: ActivityScope) =>
    [...activityKeys.all(tenantId), 'open-tasks', scope] as const,
  history: (tenantId: string, params: ActivityHistoryParams) =>
    [...activityKeys.all(tenantId), 'history', params] as const,
}

export function openTasksQueryOptions(tenantId: string, scope: ActivityScope) {
  return queryOptions({
    queryKey: activityKeys.openTasks(tenantId, scope),
    queryFn: () => fetchOpenTasks({ data: scope }),
  })
}

export function activityHistoryQueryOptions(
  tenantId: string,
  params: ActivityHistoryParams,
) {
  return queryOptions({
    queryKey: activityKeys.history(tenantId, params),
    queryFn: () => fetchActivityHistory({ data: params }),
    placeholderData: keepPreviousData,
  })
}

export function useOpenTasks(scope: ActivityScope) {
  return useQuery(openTasksQueryOptions(useWorkspaceId(), scope))
}

export function useActivityHistory(params: ActivityHistoryParams) {
  return useQuery(activityHistoryQueryOptions(useWorkspaceId(), params))
}

function useInvalidateActivities() {
  const queryClient = useQueryClient()
  const tenantId = useWorkspaceId()
  return () =>
    queryClient.invalidateQueries({ queryKey: activityKeys.all(tenantId) })
}

// Create and update toast on success only; their failures show in the open
// form. Done and delete have no form, so they toast both ways.

export function useCreateActivity() {
  const create = useServerFn(createActivityFn)
  const invalidate = useInvalidateActivities()
  return useMutation({
    mutationFn: (values: ActivityFormValues) => create({ data: values }),
    onSuccess: async (activity) => {
      toast.success(`Activity logged: ${activity.subject}`)
      await invalidate()
    },
  })
}

export function useUpdateActivity() {
  const update = useServerFn(updateActivityFn)
  const invalidate = useInvalidateActivities()
  return useMutation({
    mutationFn: ({
      id,
      values: { customerId: _, ...values },
    }: {
      id: string
      values: ActivityFormValues
    }) => update({ data: { ...values, activityId: id } }),
    onSuccess: async () => {
      toast.success('Changes saved')
      await invalidate()
    },
  })
}

export function useSetActivityDone() {
  const setDone = useServerFn(setActivityDoneFn)
  const invalidate = useInvalidateActivities()
  return useMutation({
    mutationFn: ({ activity, done }: { activity: Activity; done: boolean }) =>
      setDone({ data: { activityId: activity.id, done } }),
    onSuccess: async (activity) => {
      toast.success(
        activity.done
          ? `Task done: ${activity.subject}`
          : `Task reopened: ${activity.subject}`,
      )
      await invalidate()
    },
    onError: async (error, { activity }) => {
      toast.error(
        failureMessage(
          error,
          `Could not update ${activity.subject}. Try again.`,
        ),
      )
      await invalidate()
    },
  })
}

export function useDeleteActivity() {
  const remove = useServerFn(deleteActivityFn)
  const invalidate = useInvalidateActivities()
  return useMutation({
    mutationFn: (activity: Activity) =>
      remove({ data: { activityId: activity.id } }),
    onSuccess: async (_, activity) => {
      toast.success(`Activity deleted: ${activity.subject}`)
      await invalidate()
    },
    onError: async (error, activity) => {
      if (isAppError(error) && error.code === 'NOT_FOUND') {
        toast.error(`${activity.subject} was already deleted.`)
        await invalidate()
        return
      }
      toast.error(
        failureMessage(
          error,
          `Could not delete ${activity.subject}. Try again.`,
        ),
      )
    },
  })
}

/** The server's own message for an archived customer, otherwise `fallback`. */
function failureMessage(error: unknown, fallback: string): string {
  return isAppError(error) && error.code === 'CUSTOMER_ARCHIVED'
    ? error.message
    : fallback
}
