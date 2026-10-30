import { getRouteApi, Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  BanIcon,
  CircleCheckIcon,
  FileTextIcon,
  PencilIcon,
  SendIcon,
} from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InvoiceStatusBadge } from '@/features/invoices/components/invoice-status-badge'
import { InvoiceTotals } from '@/features/invoices/components/invoice-totals'
import {
  useInvoice,
  useInvoiceAction,
} from '@/features/invoices/hooks/use-invoices'
import { invoiceLabel } from '@/features/invoices/types/invoice'
import { isAppError } from '@/lib/app-error'
import { errorMessage } from '@/lib/error-message'
import { formatDate, formatMoney } from '@/lib/format'

const route = getRouteApi('/_authenticated/invoices/$invoiceId')

const NOT_SET = 'Not set'

export function InvoiceDetailsPage() {
  const { invoiceId } = route.useParams()
  const invoice = useInvoice(invoiceId)
  const action = useInvoiceAction()
  const [isVoiding, setIsVoiding] = useState(false)

  const backLink = (
    <Button asChild variant="link" className="self-start px-0">
      <Link to="/invoices">
        <ArrowLeftIcon aria-hidden="true" />
        Back to invoices
      </Link>
    </Button>
  )

  if (invoice.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        {backLink}
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (invoice.error) {
    return (
      <div className="flex flex-col gap-2">
        {backLink}
        {isAppError(invoice.error) && invoice.error.code === 'NOT_FOUND' ? (
          <EmptyState
            icon={FileTextIcon}
            title="Invoice not found"
            description="This invoice does not exist."
          />
        ) : (
          <ErrorState
            message={errorMessage(invoice.error)}
            onRetry={() => void invoice.refetch()}
          />
        )}
      </div>
    )
  }

  const data = invoice.data
  const label = invoiceLabel(data)
  const isArchived = data.customer.isArchived
  // Rule 32: an archived customer's drafts are read-only; sent invoices can
  // still be paid or voided.
  const canEdit = data.status === 'draft' && !isArchived
  const canVoid =
    data.status === 'sent' || (data.status === 'draft' && !isArchived)

  const actions = (
    <>
      {canEdit && (
        <Button asChild variant="outline">
          <Link to="/invoices/edit/$invoiceId" params={{ invoiceId }}>
            <PencilIcon aria-hidden="true" />
            Edit draft
          </Link>
        </Button>
      )}
      {canEdit && (
        <Button
          disabled={action.isPending}
          onClick={() => action.mutate({ invoice: data, action: 'send' })}
        >
          <SendIcon aria-hidden="true" />
          Send invoice
        </Button>
      )}
      {data.status === 'sent' && (
        <Button
          disabled={action.isPending}
          onClick={() => action.mutate({ invoice: data, action: 'markPaid' })}
        >
          <CircleCheckIcon aria-hidden="true" />
          Mark as paid
        </Button>
      )}
      {canVoid && (
        <Button variant="outline" onClick={() => setIsVoiding(true)}>
          <BanIcon aria-hidden="true" />
          Void invoice
        </Button>
      )}
    </>
  )

  return (
    <div className="flex flex-col gap-2">
      {backLink}
      <PageHeader
        title={label}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge status={data.status} />
            <span>
              for{' '}
              <Link
                to="/customers/$customerId"
                params={{ customerId: data.customer.id }}
                className="underline underline-offset-4"
              >
                {data.customer.name}
              </Link>
              {isArchived && ' (archived)'}
            </span>
          </span>
        }
        actions={actions}
      />

      <dl className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Issued">
          {data.issuedAt ? formatDate(data.issuedAt) : 'Not sent yet'}
        </Detail>
        <Detail label="Due">
          {data.dueDate ? formatDate(data.dueDate) : NOT_SET}
        </Detail>
        <Detail label="Deal">
          {data.deal ? (
            <Link
              to="/deals/$dealId"
              params={{ dealId: data.deal.id }}
              className="underline underline-offset-4"
            >
              {data.deal.title}
            </Link>
          ) : (
            NOT_SET
          )}
        </Detail>
        <Detail label="Currency">{data.currency}</Detail>
      </dl>

      <section
        aria-labelledby="invoice-lines"
        className="mt-6 flex flex-col gap-4"
      >
        <h2 id="invoice-lines" className="text-lg font-semibold">
          Line items
        </h2>
        {data.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No lines yet. Edit the draft to add them; an invoice needs one to be
            sent.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <caption className="sr-only">Line items of {label}</caption>
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th scope="col" className="p-3 font-medium">
                    Description
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Quantity
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Unit price
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => (
                  <tr key={line.id} className="border-t">
                    <td className="p-3">{line.description}</td>
                    <td className="p-3 text-right tabular-nums">
                      {line.quantity}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap tabular-nums">
                      {formatMoney(line.unitPrice, data.currency)}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap tabular-nums">
                      {formatMoney(line.amount, data.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <InvoiceTotals
          currency={data.currency}
          taxRate={data.taxRate}
          subtotal={data.subtotal}
          tax={data.tax}
          total={data.total}
        />
      </section>

      {data.notes && (
        <section aria-labelledby="invoice-notes" className="mt-6">
          <h2 id="invoice-notes" className="mb-2 text-lg font-semibold">
            Notes
          </h2>
          <p className="whitespace-pre-wrap">{data.notes}</p>
        </section>
      )}

      <ConfirmDialog
        open={isVoiding}
        onOpenChange={setIsVoiding}
        title="Void invoice?"
        description={`This will void ${label}. A voided invoice cannot be changed${data.number ? ', and its number is not reused' : ''}.`}
        confirmLabel="Void invoice"
        variant="destructive"
        isPending={action.isPending}
        onConfirm={() =>
          action.mutate(
            { invoice: data, action: 'void' },
            { onSettled: () => setIsVoiding(false) },
          )
        }
      />
    </div>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
