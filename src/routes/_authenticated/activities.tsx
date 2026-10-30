import { createFileRoute } from '@tanstack/react-router'
import {
  ActivitiesPage,
  activityHistoryQueryOptions,
  activitySearchSchema,
  openTasksQueryOptions,
  toHistoryState,
} from '@/features/activities'

export const Route = createFileRoute('/_authenticated/activities')({
  validateSearch: activitySearchSchema,
  loaderDeps: ({ search }) => toHistoryState(search),
  // Prefetch both lists so the server-rendered page already shows them.
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        openTasksQueryOptions(context.workspace.id, {}),
      ),
      context.queryClient.ensureQueryData(
        activityHistoryQueryOptions(context.workspace.id, deps),
      ),
    ]),
  component: ActivitiesPage,
})
