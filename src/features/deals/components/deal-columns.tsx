import { Link } from '@tanstack/react-router'
import { createDataTableColumnHelper } from '@/components/data-table'
import { DealRowActions } from '@/features/deals/components/deal-row-actions'
import { DealStageBadge } from '@/features/deals/components/deal-stage-badge'
import type { Deal } from '@/features/deals/types/deal'
import { formatDate, formatMoney } from '@/lib/format'

const helper = createDataTableColumnHelper<Deal>()

const NOT_SET = '—'

/**
 * Column ids match the server's sort keys (title, expectedCloseDate). Value
 * is not sortable: amounts in different currencies cannot be compared. The
 * row actions get their callbacks from the DataTable `meta` prop.
 */
export const dealColumns = helper.columns([
  helper.accessor('title', {
    header: 'Title',
    enableSorting: true,
    cell: ({ row }) => (
      <Link
        to="/deals/$dealId"
        params={{ dealId: row.original.id }}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  }),
  helper.accessor((deal) => deal.customer.name, {
    id: 'customer',
    header: 'Customer',
    // Explains why an archived customer's deals have no Edit or Delete.
    cell: ({ row }) => (
      <>
        {row.original.customer.name}
        {row.original.customer.isArchived && (
          <span className="text-muted-foreground"> (archived)</span>
        )}
      </>
    ),
  }),
  helper.accessor('value', {
    header: 'Value',
    cell: ({ row }) => formatMoney(row.original.value, row.original.currency),
  }),
  helper.accessor('stage', {
    header: 'Stage',
    cell: ({ getValue }) => <DealStageBadge stage={getValue()} />,
  }),
  helper.accessor('expectedCloseDate', {
    header: 'Expected close',
    enableSorting: true,
    cell: ({ getValue }) => {
      const date = getValue()
      return date ? formatDate(date) : NOT_SET
    },
  }),
  helper.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => (
      <DealRowActions
        deal={row.original}
        onEdit={table.options.meta?.onEditRow}
        onDelete={table.options.meta?.onDeleteRow}
      />
    ),
  }),
])
