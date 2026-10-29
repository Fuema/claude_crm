import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import {
  archiveCustomerFn,
  createCustomerFn,
  fetchCustomer,
  fetchCustomers,
  restoreCustomerFn,
  updateCustomerFn,
} from '@/features/customers/server/customer-functions'
import type { Customer } from '@/features/customers/types/customer'
import type { CustomerFormValues } from '@/features/customers/types/customer-form-schema'
import type { CustomerListParams } from '@/features/customers/types/customer-search'
import { isAppError } from '@/lib/app-error'

/** Keys start with the workspace id (docs/data-and-api.md). */
export const customerKeys = {
  all: (tenantId: string) => ['tenant', tenantId, 'customers'] as const,
  lists: (tenantId: string) => [...customerKeys.all(tenantId), 'list'] as const,
  list: (tenantId: string, params: CustomerListParams) =>
    [...customerKeys.lists(tenantId), params] as const,
  detail: (tenantId: string, id: string) =>
    [...customerKeys.all(tenantId), 'detail', id] as const,
}

export function customersQueryOptions(
  tenantId: string,
  params: CustomerListParams,
) {
  return queryOptions({
    queryKey: customerKeys.list(tenantId, params),
    queryFn: () => fetchCustomers({ data: params }),
    placeholderData: keepPreviousData,
  })
}

export function customerQueryOptions(tenantId: string, customerId: string) {
  return queryOptions({
    queryKey: customerKeys.detail(tenantId, customerId),
    queryFn: () => fetchCustomer({ data: { customerId } }),
  })
}

const authenticatedRoute = getRouteApi('/_authenticated')

function useTenantId(): string {
  return authenticatedRoute.useRouteContext().workspace.id
}

/** One page of the customer list; keeps the previous page while the next loads. */
export function useCustomers(params: CustomerListParams) {
  return useQuery(customersQueryOptions(useTenantId(), params))
}

export function useCustomer(customerId: string) {
  return useQuery({
    ...customerQueryOptions(useTenantId(), customerId),
    retry: (failureCount, error) => !isCustomerGone(error) && failureCount < 2,
  })
}

function useInvalidateCustomers() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  return () =>
    queryClient.invalidateQueries({ queryKey: customerKeys.all(tenantId) })
}

// Create and update toast on success only. Their failures are shown inside
// the open form (on a field, or for the whole form; see CustomerForm), next
// to what the user was doing. Archive and restore have no form, so they
// toast both ways.

export function useCreateCustomer() {
  const create = useServerFn(createCustomerFn)
  const invalidate = useInvalidateCustomers()
  return useMutation({
    mutationFn: (variables: {
      values: CustomerFormValues
      idempotencyKey: string
    }) =>
      create({
        data: { ...variables.values, idempotencyKey: variables.idempotencyKey },
      }),
    onSuccess: async (customer) => {
      toast.success(`Customer added: ${customer.name}`)
      await invalidate()
    },
  })
}

export function useUpdateCustomer() {
  const update = useServerFn(updateCustomerFn)
  const invalidate = useInvalidateCustomers()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: CustomerFormValues }) =>
      update({ data: { ...values, customerId: id } }),
    onSuccess: async () => {
      toast.success('Changes saved')
      await invalidate()
    },
  })
}

function useStatusMutation(
  action: typeof archiveCustomerFn,
  messages: { done: string; failed: string },
) {
  const run = useServerFn(action)
  const invalidate = useInvalidateCustomers()
  return useMutation({
    mutationFn: (customer: Customer) =>
      run({ data: { customerId: customer.id } }),
    onSuccess: async (customer) => {
      toast.success(`${messages.done}: ${customer.name}`)
      await invalidate()
    },
    onError: async (error, customer) => {
      if (isCustomerGone(error)) {
        toast.error(`${customer.name} no longer exists.`)
        await invalidate()
        return
      }
      toast.error(`${messages.failed} ${customer.name}. Try again.`)
    },
  })
}

export function useArchiveCustomer() {
  return useStatusMutation(archiveCustomerFn, {
    done: 'Customer archived',
    failed: 'Could not archive',
  })
}

export function useRestoreCustomer() {
  return useStatusMutation(restoreCustomerFn, {
    done: 'Customer restored',
    failed: 'Could not restore',
  })
}

/** The customer does not exist (anymore) in this workspace. */
export function isCustomerGone(error: unknown): boolean {
  return isAppError(error) && error.code === 'NOT_FOUND'
}
