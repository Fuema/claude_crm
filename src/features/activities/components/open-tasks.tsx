import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { ErrorState } from '@/components/error-state'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type ActivityActionHandlers,
  ActivityActions,
} from '@/features/activities/components/activity-actions'
import type { Activity } from '@/features/activities/types/activity'
import { useTodayIsoDate } from '@/hooks/use-today'
import { formatDate } from '@/lib/format'

interface OpenTasksProps extends ActivityActionHandlers {
  tasks: Activity[] | undefined
  isLoading: boolean
  errorMessage?: string
  onRetry: () => void
  headingLevel: 'h2' | 'h3'
  /** Hide the customer name, e.g. on the customer's own page. */
  showCustomer?: boolean
}

/** Rule 27: open tasks first, by due date, each with its own Done box. */
export function OpenTasks({
  tasks,
  isLoading,
  errorMessage,
  onRetry,
  showCustomer = true,
  headingLevel: Heading,
  ...handlers
}: OpenTasksProps) {
  const headingId = useId()
  const today = useTodayIsoDate()

  let content: React.ReactNode
  if (errorMessage) {
    content = <ErrorState message={errorMessage} onRetry={onRetry} />
  } else if (isLoading || !tasks) {
    content = (
      <div className="flex flex-col gap-2">
        <span role="status" className="sr-only">
          Loading open tasks
        </span>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    )
  } else if (tasks.length === 0) {
    content = <p className="text-sm text-muted-foreground">No open tasks.</p>
  } else {
    content = (
      <ul className="divide-y rounded-lg border">
        {tasks.map((task) => (
          <OpenTask
            key={task.id}
            task={task}
            // Unknown until hydrated, so the server never guesses the date.
            isOverdue={today !== null && task.date < today}
            showCustomer={showCustomer}
            {...handlers}
          />
        ))}
      </ul>
    )
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <Heading id={headingId} className="font-medium">
        Open tasks
      </Heading>
      {content}
    </section>
  )
}

interface OpenTaskProps extends ActivityActionHandlers {
  task: Activity
  isOverdue: boolean
  showCustomer: boolean
}

function OpenTask({
  task,
  isOverdue,
  showCustomer,
  ...handlers
}: OpenTaskProps) {
  const checkboxId = useId()
  const isReadOnly = task.customer.isArchived
  return (
    <li className="flex items-start gap-3 p-3">
      <Checkbox
        id={checkboxId}
        className="mt-0.5"
        checked={false}
        disabled={isReadOnly}
        onCheckedChange={() => handlers.onSetDone(task, true)}
        aria-label={`Mark ${task.subject} as done`}
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={checkboxId} className="font-medium">
          {task.subject}
        </label>
        <p className="text-sm text-muted-foreground">
          Due {formatDate(task.date)}
          {/* Text, not only color, says it is late. */}
          {isOverdue && (
            <span className="font-medium text-destructive"> · Overdue</span>
          )}
          {showCustomer && (
            <>
              {' · '}
              <Link
                to="/customers/$customerId"
                params={{ customerId: task.customer.id }}
                className="underline-offset-4 hover:underline"
              >
                {task.customer.name}
              </Link>
            </>
          )}
          {task.deal && (
            <>
              {' · '}
              <Link
                to="/deals/$dealId"
                params={{ dealId: task.deal.id }}
                className="underline-offset-4 hover:underline"
              >
                {task.deal.title}
              </Link>
            </>
          )}
        </p>
      </div>
      {!isReadOnly && <ActivityActions activity={task} {...handlers} />}
    </li>
  )
}
