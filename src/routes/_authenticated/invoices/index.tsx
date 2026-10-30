import { createFileRoute } from '@tanstack/react-router'
import {
  InvoicesPage,
  invoiceSearchSchema,
  invoicesQueryOptions,
  toInvoiceListParams,
} from '@/features/invoices'

export const Route = createFileRoute('/_authenticated/invoices/')({
  validateSearch: invoiceSearchSchema,
  loaderDeps: ({ search }) => toInvoiceListParams(search),
  // Prefetch so the server-rendered page already shows the list.
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      invoicesQueryOptions(context.workspace.id, deps),
    ),
  component: InvoicesPage,
})
