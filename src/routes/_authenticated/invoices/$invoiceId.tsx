import { createFileRoute } from '@tanstack/react-router'
import { InvoiceDetailsPage, invoiceQueryOptions } from '@/features/invoices'

export const Route = createFileRoute('/_authenticated/invoices/$invoiceId')({
  // Prefetch for SSR; a missing invoice is shown by the page, not thrown here.
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(
      invoiceQueryOptions(context.workspace.id, params.invoiceId),
    ),
  component: InvoiceDetailsPage,
})
