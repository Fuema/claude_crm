import { createFileRoute } from '@tanstack/react-router'
import { CustomerDetailsPage, customerQueryOptions } from '@/features/customers'

export const Route = createFileRoute('/_authenticated/customers/$customerId')({
  // Prefetch for SSR; a missing customer is shown by the page, not thrown here.
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(
      customerQueryOptions(context.workspace.id, params.customerId),
    ),
  component: CustomerDetailsPage,
})
