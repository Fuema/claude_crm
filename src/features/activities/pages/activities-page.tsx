import { getRouteApi } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useId } from 'react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActivityPanel } from '@/features/activities/components/activity-panel'
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPES,
  activityTypeSchema,
} from '@/features/activities/types/activity'
import {
  toHistoryState,
  toPageSizeParam,
} from '@/features/activities/types/activity-search'

const route = getRouteApi('/_authenticated/activities')

const ALL_TYPES = 'all'

/** Every activity of the workspace: open tasks first, then the history. */
export function ActivitiesPage() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const typeFilterId = useId()
  const history = toHistoryState(search)

  const typeFilter = (
    <div className="flex flex-col gap-2">
      <Label htmlFor={typeFilterId}>Type</Label>
      <Select
        value={history.type ?? ALL_TYPES}
        onValueChange={(value) => {
          const type = activityTypeSchema.safeParse(value)
          void navigate({
            search: (previous) => ({
              ...previous,
              type: type.success ? type.data : undefined,
              page: undefined,
            }),
          })
        }}
      >
        <SelectTrigger id={typeFilterId} className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TYPES}>All types</SelectItem>
          {ACTIVITY_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {ACTIVITY_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <>
      <PageHeader
        title="Activities"
        description="Calls, meetings, emails, and tasks across all customers."
      />
      <ActivityPanel
        scope={{}}
        history={history}
        headingLevel="h2"
        historyToolbar={typeFilter}
        onHistoryChange={({ page, pageSize }) =>
          void navigate({
            search: (previous) => ({
              ...previous,
              page: page > 1 ? page : undefined,
              pageSize: toPageSizeParam(pageSize),
            }),
          })
        }
        renderLogButton={(open) => (
          <Button onClick={open}>
            <PlusIcon aria-hidden="true" />
            Log activity
          </Button>
        )}
      />
    </>
  )
}
