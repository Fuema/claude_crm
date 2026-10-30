import {
  CheckIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Activity } from '@/features/activities/types/activity'

export interface ActivityActionHandlers {
  onEdit: (activity: Activity) => void
  onSetDone: (activity: Activity, done: boolean) => void
  onDelete: (activity: Activity) => void
}

interface ActivityActionsProps extends ActivityActionHandlers {
  activity: Activity
}

/** Edit, mark a task done or not done (rule 27), and delete (rule 26). */
export function ActivityActions({
  activity,
  onEdit,
  onSetDone,
  onDelete,
}: ActivityActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${activity.subject}`}
        >
          <MoreHorizontalIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(activity)}>
          <PencilIcon aria-hidden="true" />
          Edit activity
        </DropdownMenuItem>
        {activity.type === 'task' && (
          <DropdownMenuItem
            onSelect={() => onSetDone(activity, !activity.done)}
          >
            {activity.done ? (
              <RotateCcwIcon aria-hidden="true" />
            ) : (
              <CheckIcon aria-hidden="true" />
            )}
            {activity.done ? 'Mark as not done' : 'Mark as done'}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onDelete(activity)}
        >
          <Trash2Icon aria-hidden="true" />
          Delete activity
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
