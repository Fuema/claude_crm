import { Link } from '@tanstack/react-router'
import { createDataTableColumnHelper } from '@/components/data-table'
import { InvoiceStatusBadge } from '@/features/invoices/components/invoice-status-badge'
import { type Invoice, invoiceLabel } from '@/features/invoices/types/invoice'
import { formatDate, formatMoney } from '@/lib/format'

const helper = createDataTableColumnHelper<Invoice>()

const NOT_SET = '—'

/** The invoice list. Totals are in each invoice's own currency (rule 33). */
export const invoiceColumns = helper.columns([
  helper.accessor((invoice) => invoiceLabel(invoice), {
    id: 'number',
    header: 'Invoice',
    cell: ({ row }) => (
      <Link
        to="/invoices/$invoiceId"
        params={{ invoiceId: row.original.id }}
        className="font-medium whitespace-nowrap underline-offset-4 hover:underline"
      >
        {invoiceLabel(row.original)}
      </Link>
    ),
  }),
  helper.accessor((invoice) => invoice.customer.name, {
    id: 'customer',
    header: 'Customer',
    cell: ({ row }) => (
      <>
        {row.original.customer.name}
        {row.original.customer.isArchived && (
          <span className="text-muted-foreground"> (archived)</span>
        )}
      </>
    ),
  }),
  helper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => <InvoiceStatusBadge status={getValue()} />,
  }),
  helper.accessor('issuedAt', {
    header: 'Issued',
    cell: ({ getValue }) => {
      const date = getValue()
      return date ? formatDate(date) : NOT_SET
    },
  }),
  helper.accessor('dueDate', {
    header: 'Due',
    cell: ({ getValue }) => {
      const date = getValue()
      return date ? formatDate(date) : NOT_SET
    },
  }),
  helper.accessor('total', {
    header: () => <span className="block text-right">Total</span>,
    cell: ({ row }) => (
      <span className="block text-right whitespace-nowrap tabular-nums">
        {formatMoney(row.original.total, row.original.currency)}
      </span>
    ),
  }),
])
