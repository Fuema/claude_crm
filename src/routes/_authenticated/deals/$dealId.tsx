import { createFileRoute } from '@tanstack/react-router'
import { DealDetailsPage, dealQueryOptions } from '@/features/deals'

export const Route = createFileRoute('/_authenticated/deals/$dealId')({
  // Prefetch for SSR; a missing deal is shown by the page, not thrown here.
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(
      dealQueryOptions(context.workspace.id, params.dealId),
    ),
  component: DealDetailsPage,
})
