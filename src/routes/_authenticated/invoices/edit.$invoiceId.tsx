import { createFileRoute } from '@tanstack/react-router'
import { EditInvoicePage, invoiceQueryOptions } from '@/features/invoices'

export const Route = createFileRoute(
  '/_authenticated/invoices/edit/$invoiceId',
)({
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(
      invoiceQueryOptions(context.workspace.id, params.invoiceId),
    ),
  component: EditInvoiceRoute,
})

function EditInvoiceRoute() {
  const { invoiceId } = Route.useParams()
  return <EditInvoicePage key={invoiceId} invoiceId={invoiceId} />
}
