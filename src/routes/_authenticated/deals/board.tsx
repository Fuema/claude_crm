import { createFileRoute } from '@tanstack/react-router'
import {
  boardDealsQueryOptions,
  DealBoardPage,
  dealBoardSearchSchema,
} from '@/features/deals'

export const Route = createFileRoute('/_authenticated/deals/board')({
  validateSearch: dealBoardSearchSchema,
  loaderDeps: ({ search }) => ({ customerId: search.customer }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      boardDealsQueryOptions(context.workspace.id, deps.customerId),
    ),
  component: DealBoardPage,
})
