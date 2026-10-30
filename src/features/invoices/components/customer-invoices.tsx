import { Link } from '@tanstack/react-router'
import { FileTextIcon, PlusIcon } from 'lucide-react'
import { useId } from 'react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InvoiceStatusBadge } from '@/features/invoices/components/invoice-status-badge'
import { useCustomerInvoices } from '@/features/invoices/hooks/use-invoices'
import { invoiceLabel } from '@/features/invoices/types/invoice'
import { errorMessage } from '@/lib/error-message'
import { formatDate, formatMoney } from '@/lib/format'

interface CustomerInvoicesProps {
  customerId: string
  customerName: string
  /** Rule 32: no new invoices for an archived customer. */
  isReadOnly: boolean
}

/** The Invoices section on a customer's page. */
export function CustomerInvoices({
  customerId,
  customerName,
  isReadOnly,
}: CustomerInvoicesProps) {
  const headingId = useId()
  const invoices = useCustomerInvoices(customerId)

  const newInvoice = !isReadOnly && (
    <Button asChild>
      <Link to="/invoices/new" search={{ customer: customerId }}>
        <PlusIcon aria-hidden="true" />
        New invoice
      </Link>
    </Button>
  )

  let content: React.ReactNode
  if (invoices.isPending) {
    content = <Skeleton className="h-24 w-full" />
  } else if (invoices.error) {
    content = (
      <ErrorState
        message={errorMessage(invoices.error)}
        onRetry={() => void invoices.refetch()}
      />
    )
  } else if (invoices.data.length === 0) {
    content = (
      <EmptyState
        icon={FileTextIcon}
        title="No invoices yet"
        description={`${customerName} has no invoices.`}
      />
    )
  } else {
    content = (
      <ul className="divide-y rounded-lg border">
        {invoices.data.map((invoice) => (
          <li
            key={invoice.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3"
          >
            <Link
              to="/invoices/$invoiceId"
              params={{ invoiceId: invoice.id }}
              className="font-medium underline-offset-4 hover:underline"
            >
              {invoiceLabel(invoice)}
            </Link>
            <InvoiceStatusBadge status={invoice.status} />
            <span className="text-sm text-muted-foreground">
              {invoice.issuedAt
                ? `Issued ${formatDate(invoice.issuedAt)}`
                : 'Not sent yet'}
            </span>
            <span className="ml-auto tabular-nums">
              {formatMoney(invoice.total, invoice.currency)}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section aria-labelledby={headingId} className="mt-8 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold">
          Invoices
        </h2>
        {newInvoice}
      </div>
      {content}
    </section>
  )
}
