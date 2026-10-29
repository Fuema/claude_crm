import { createFileRoute } from '@tanstack/react-router'
import {
  CustomersPage,
  customerSearchSchema,
  customersQueryOptions,
  toCustomerListParams,
} from '@/features/customers'

export const Route = createFileRoute('/_authenticated/customers/')({
  validateSearch: customerSearchSchema,
  loaderDeps: ({ search }) => toCustomerListParams(search),
  // Prefetch so the server-rendered page already shows the list.
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      customersQueryOptions(context.workspace.id, deps),
    ),
  component: CustomersPage,
})
