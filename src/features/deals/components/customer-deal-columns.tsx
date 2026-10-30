import { Link } from '@tanstack/react-router'
import { createGenericTableColumnHelper } from '@/components/generic-table'
import { DealRowActions } from '@/features/deals/components/deal-row-actions'
import { DealStageBadge } from '@/features/deals/components/deal-stage-badge'
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type Deal,
} from '@/features/deals/types/deal'
import { formatDate, formatMoney } from '@/lib/format'

const helper = createGenericTableColumnHelper<Deal>()

const NOT_SET = '—'

/**
 * Columns of one customer's deals, searched and sorted in the browser. The
 * search box matches the title, stage, and contact. Value is not sortable:
 * amounts in different currencies cannot be compared.
 */
export const customerDealColumns = helper.columns([
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
  helper.accessor('value', {
    header: 'Value',
    enableGlobalFilter: false,
    cell: ({ row }) => formatMoney(row.original.value, row.original.currency),
  }),
  helper.accessor((deal) => DEAL_STAGE_LABELS[deal.stage], {
    id: 'stage',
    header: 'Stage',
    enableSorting: true,
    // Pipeline order, not alphabetical.
    sortFn: (rowA, rowB) =>
      DEAL_STAGES.indexOf(rowA.original.stage) -
      DEAL_STAGES.indexOf(rowB.original.stage),
    cell: ({ row }) => <DealStageBadge stage={row.original.stage} />,
  }),
  helper.accessor((deal) => deal.contact?.name ?? '', {
    id: 'contact',
    header: 'Contact',
    cell: ({ getValue }) => getValue() || NOT_SET,
  }),
  helper.accessor((deal) => deal.expectedCloseDate ?? '', {
    id: 'expectedCloseDate',
    header: 'Expected close',
    enableSorting: true,
    enableGlobalFilter: false,
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
