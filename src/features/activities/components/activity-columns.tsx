import { Link } from '@tanstack/react-router'
import { createDataTableColumnHelper } from '@/components/data-table'
import { ActivityActions } from '@/features/activities/components/activity-actions'
import { ActivityTypeBadge } from '@/features/activities/components/activity-type-badge'
import type { Activity } from '@/features/activities/types/activity'
import { formatDate } from '@/lib/format'

const helper = createDataTableColumnHelper<Activity>()

const NOT_SET = '—'

/**
 * The history table (everything but open tasks, newest first; rule 27). Row
 * actions get their callbacks from the DataTable `meta` prop and are hidden
 * for an archived customer's activities (rule 25).
 */
export const activityColumns = helper.columns([
  helper.accessor('date', {
    header: 'Date',
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap">{formatDate(getValue())}</span>
    ),
  }),
  helper.accessor('type', {
    header: 'Type',
    cell: ({ row }) => (
      <span className="flex flex-wrap items-center gap-1">
        <ActivityTypeBadge type={row.original.type} />
        {row.original.done && (
          <span className="text-sm text-muted-foreground">Done</span>
        )}
      </span>
    ),
  }),
  helper.accessor('subject', {
    header: 'Subject',
    cell: ({ row }) => (
      <div className="min-w-48">
        <div className="font-medium">{row.original.subject}</div>
        {row.original.notes && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {row.original.notes}
          </p>
        )}
      </div>
    ),
  }),
  helper.accessor((activity) => activity.customer.name, {
    id: 'customer',
    header: 'Customer',
    cell: ({ row }) => (
      <Link
        to="/customers/$customerId"
        params={{ customerId: row.original.customer.id }}
        className="underline-offset-4 hover:underline"
      >
        {row.original.customer.name}
      </Link>
    ),
  }),
  helper.accessor((activity) => activity.deal?.title ?? NOT_SET, {
    id: 'deal',
    header: 'Deal',
    cell: ({ row }) =>
      row.original.deal ? (
        <Link
          to="/deals/$dealId"
          params={{ dealId: row.original.deal.id }}
          className="underline-offset-4 hover:underline"
        >
          {row.original.deal.title}
        </Link>
      ) : (
        NOT_SET
      ),
  }),
  helper.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => {
      const meta = table.options.meta
      if (
        row.original.customer.isArchived ||
        !meta?.onEditRow ||
        !meta.onDeleteRow ||
        !meta.onSetDoneRow
      ) {
        return null
      }
      return (
        <ActivityActions
          activity={row.original}
          onEdit={meta.onEditRow}
          onDelete={meta.onDeleteRow}
          onSetDone={meta.onSetDoneRow}
        />
      )
    },
  }),
])
