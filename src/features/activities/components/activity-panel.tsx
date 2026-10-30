import { HistoryIcon } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'
import {
  DataTable,
  type DataTablePageChange,
  type PAGE_SIZE_OPTIONS,
} from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { activityColumns } from '@/features/activities/components/activity-columns'
import {
  ActivityFormDialog,
  DeleteActivityDialog,
} from '@/features/activities/components/activity-dialogs'
import { OpenTasks } from '@/features/activities/components/open-tasks'
import {
  useActivityHistory,
  useOpenTasks,
  useSetActivityDone,
} from '@/features/activities/hooks/use-activities'
import type {
  Activity,
  ActivityScope,
  ActivityType,
} from '@/features/activities/types/activity'
import { errorMessage } from '@/lib/error-message'
import type { LookupOption } from '@/types/lookup-option'

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

export interface HistoryState {
  page: number
  pageSize: PageSize
  type?: ActivityType
}

interface ActivityPanelProps {
  scope: ActivityScope
  history: HistoryState
  onHistoryChange: (change: DataTablePageChange) => void
  /** Filters shown above the history table, e.g. the type filter. */
  historyToolbar?: ReactNode
  /** When set, new activities are for this customer and it cannot be changed. */
  customer?: LookupOption
  /** An archived customer's activities are shown read-only (rule 25). */
  isReadOnly?: boolean
  /** `h2` on the Activities page, `h3` inside a page section. */
  headingLevel: 'h2' | 'h3'
  /** Renders the "Log activity" button, which opens the form. */
  renderLogButton: (open: () => void) => ReactNode
}

/** Open tasks, then the history (rule 27), with the log/edit/delete dialogs. */
export function ActivityPanel({
  scope,
  history,
  onHistoryChange,
  historyToolbar,
  customer,
  isReadOnly = false,
  headingLevel,
  renderLogButton,
}: ActivityPanelProps) {
  const Heading = headingLevel
  const historyHeadingId = useId()
  const openTasks = useOpenTasks(scope)
  const historyQuery = useActivityHistory({
    ...scope,
    type: history.type,
    page: history.page,
    pageSize: history.pageSize,
  })
  const setDone = useSetActivityDone()
  const [isLogging, setIsLogging] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [deleting, setDeleting] = useState<Activity | null>(null)

  const handlers = {
    onEdit: setEditing,
    onDelete: setDeleting,
    onSetDone: (activity: Activity, done: boolean) =>
      setDone.mutate({ activity, done }),
  }

  return (
    <div className="flex flex-col gap-6">
      {!isReadOnly && (
        <div className="flex justify-end">
          {renderLogButton(() => setIsLogging(true))}
        </div>
      )}
      <OpenTasks
        tasks={openTasks.data}
        isLoading={openTasks.isPending}
        errorMessage={
          openTasks.error ? errorMessage(openTasks.error) : undefined
        }
        onRetry={() => void openTasks.refetch()}
        showCustomer={!scope.customerId}
        headingLevel={headingLevel}
        {...handlers}
      />
      <section
        aria-labelledby={historyHeadingId}
        className="flex flex-col gap-3"
      >
        <Heading id={historyHeadingId} className="font-medium">
          History
        </Heading>
        <DataTable
          caption="Activity history"
          columns={activityColumns}
          data={historyQuery.data?.items ?? []}
          getRowId={(activity) => activity.id}
          pagination={{
            page: history.page,
            pageSize: history.pageSize,
            total: historyQuery.data?.total ?? 0,
          }}
          onPaginationChange={onHistoryChange}
          toolbar={historyToolbar}
          isLoading={historyQuery.isPending}
          errorMessage={
            historyQuery.error ? errorMessage(historyQuery.error) : undefined
          }
          onRetry={() => void historyQuery.refetch()}
          emptyState={
            <EmptyState
              icon={HistoryIcon}
              title="No activities yet"
              description="Logged calls, meetings, emails, and done tasks appear here."
            />
          }
          meta={
            isReadOnly
              ? undefined
              : {
                  onEditRow: handlers.onEdit,
                  onDeleteRow: handlers.onDelete,
                  onSetDoneRow: handlers.onSetDone,
                }
          }
        />
      </section>
      <ActivityFormDialog
        open={isLogging}
        onOpenChange={setIsLogging}
        scope={scope}
        customer={customer}
      />
      <ActivityFormDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        activity={editing ?? undefined}
      />
      <DeleteActivityDialog
        activity={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />
    </div>
  )
}
