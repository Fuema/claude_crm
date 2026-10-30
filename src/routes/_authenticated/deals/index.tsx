import { createFileRoute } from '@tanstack/react-router'
import {
  DealsPage,
  dealSearchSchema,
  dealsQueryOptions,
  toDealListParams,
} from '@/features/deals'

export const Route = createFileRoute('/_authenticated/deals/')({
  validateSearch: dealSearchSchema,
  loaderDeps: ({ search }) => toDealListParams(search),
  // Prefetch so the server-rendered page already shows the list.
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      dealsQueryOptions(context.workspace.id, deps),
    ),
  component: DealsPage,
})
