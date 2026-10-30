import { createFileRoute } from '@tanstack/react-router'
import { NewInvoicePage, newInvoiceSearchSchema } from '@/features/invoices'

export const Route = createFileRoute('/_authenticated/invoices/new')({
  validateSearch: newInvoiceSearchSchema,
  component: NewInvoiceRoute,
})

function NewInvoiceRoute() {
  const { customer } = Route.useSearch()
  // Keyed so switching the preselected customer starts a fresh draft.
  return <NewInvoicePage key={customer ?? ''} customerId={customer} />
}
