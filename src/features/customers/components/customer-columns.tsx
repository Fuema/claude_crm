import { Link } from '@tanstack/react-router'
import { createDataTableColumnHelper } from '@/components/data-table'
import { CustomerRowActions } from '@/features/customers/components/customer-row-actions'
import { CustomerStatusBadge } from '@/features/customers/components/customer-status-badge'
import type { Customer } from '@/features/customers/types/customer'

const helper = createDataTableColumnHelper<Customer>()

const NOT_PROVIDED = '—'

/**
 * Column ids match the server's sort keys (name). The row actions get their
 * callbacks from the DataTable `meta` prop.
 */
export const customerColumns = helper.columns([
  helper.accessor('name', {
    header: 'Name',
    enableSorting: true,
    cell: ({ row }) => (
      <Link
        to="/customers/$customerId"
        params={{ customerId: row.original.id }}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  }),
  helper.accessor('industry', {
    header: 'Industry',
    cell: ({ getValue }) => getValue() ?? NOT_PROVIDED,
  }),
  helper.accessor('email', {
    header: 'Email',
    cell: ({ getValue }) => getValue() ?? NOT_PROVIDED,
  }),
  helper.accessor('phone', {
    header: 'Phone',
    cell: ({ getValue }) => getValue() ?? NOT_PROVIDED,
  }),
  helper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => <CustomerStatusBadge status={getValue()} />,
  }),
  helper.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => (
      <CustomerRowActions
        customer={row.original}
        onEdit={table.options.meta?.onEditRow}
        onArchive={table.options.meta?.onArchiveRow}
        onRestore={table.options.meta?.onRestoreRow}
      />
    ),
  }),
])
