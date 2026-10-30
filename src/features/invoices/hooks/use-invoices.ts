import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import {
  createInvoiceFn,
  fetchCustomerInvoices,
  fetchInvoice,
  fetchInvoices,
  invoiceActionFn,
  updateInvoiceFn,
} from '@/features/invoices/server/invoice-functions'
import { type Invoice, invoiceLabel } from '@/features/invoices/types/invoice'
import type { InvoiceFormValues } from '@/features/invoices/types/invoice-form-schema'
import type {
  InvoiceAction,
  InvoiceListParams,
} from '@/features/invoices/types/invoice-inputs'
import { useWorkspaceId } from '@/hooks/use-workspace-id'
import { isAppError } from '@/lib/app-error'
import { workspaceKey } from '@/lib/query-keys'

/** Keys start with the workspace id (docs/data-and-api.md). */
export const invoiceKeys = {
  all: (tenantId: string) => [...workspaceKey(tenantId), 'invoices'] as const,
  list: (tenantId: string, params: InvoiceListParams) =>
    [...invoiceKeys.all(tenantId), 'list', params] as const,
  byCustomer: (tenantId: string, customerId: string) =>
    [...invoiceKeys.all(tenantId), 'customer', customerId] as const,
  detail: (tenantId: string, id: string) =>
    [...invoiceKeys.all(tenantId), 'detail', id] as const,
}

export function invoicesQueryOptions(
  tenantId: string,
  params: InvoiceListParams,
) {
  return queryOptions({
    queryKey: invoiceKeys.list(tenantId, params),
    queryFn: () => fetchInvoices({ data: params }),
    placeholderData: keepPreviousData,
  })
}

export function invoiceQueryOptions(tenantId: string, invoiceId: string) {
  return queryOptions({
    queryKey: invoiceKeys.detail(tenantId, invoiceId),
    queryFn: () => fetchInvoice({ data: { invoiceId } }),
  })
}

export function useInvoices(params: InvoiceListParams) {
  return useQuery(invoicesQueryOptions(useWorkspaceId(), params))
}

export function useCustomerInvoices(customerId: string) {
  const tenantId = useWorkspaceId()
  return useQuery({
    queryKey: invoiceKeys.byCustomer(tenantId, customerId),
    queryFn: () => fetchCustomerInvoices({ data: { customerId } }),
  })
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    ...invoiceQueryOptions(useWorkspaceId(), invoiceId),
    retry: (failureCount, error) =>
      !(isAppError(error) && error.code === 'NOT_FOUND') && failureCount < 2,
  })
}

function useInvalidateInvoices() {
  const queryClient = useQueryClient()
  const tenantId = useWorkspaceId()
  return () =>
    queryClient.invalidateQueries({ queryKey: invoiceKeys.all(tenantId) })
}

// Create and update toast on success only; their failures show in the form.
// Status changes have no form, so they toast both ways.

export function useCreateInvoice() {
  const create = useServerFn(createInvoiceFn)
  const invalidate = useInvalidateInvoices()
  return useMutation({
    mutationFn: (variables: {
      values: InvoiceFormValues
      idempotencyKey: string
    }) =>
      create({
        data: {
          ...variables.values,
          idempotencyKey: variables.idempotencyKey,
        },
      }),
    onSuccess: async () => {
      toast.success('Draft invoice saved')
      await invalidate()
    },
  })
}

export function useUpdateInvoice() {
  const update = useServerFn(updateInvoiceFn)
  const invalidate = useInvalidateInvoices()
  return useMutation({
    mutationFn: ({
      id,
      values: { customerId: _, ...values },
    }: {
      id: string
      values: InvoiceFormValues
    }) => update({ data: { ...values, invoiceId: id } }),
    onSuccess: async () => {
      toast.success('Changes saved')
      await invalidate()
    },
  })
}

const ACTION_DONE: Record<InvoiceAction, (invoice: Invoice) => string> = {
  send: (invoice) => `Invoice sent: ${invoiceLabel(invoice)}`,
  markPaid: (invoice) => `Invoice paid: ${invoiceLabel(invoice)}`,
  void: (invoice) => `Invoice voided: ${invoiceLabel(invoice)}`,
}

/** Send, Mark as paid, or Void (rule 30). */
export function useInvoiceAction() {
  const run = useServerFn(invoiceActionFn)
  const invalidate = useInvalidateInvoices()
  return useMutation({
    mutationFn: ({
      invoice,
      action,
    }: {
      invoice: Invoice
      action: InvoiceAction
    }) => run({ data: { invoiceId: invoice.id, action } }),
    onSuccess: async (invoice, { action }) => {
      toast.success(ACTION_DONE[action](invoice))
      await invalidate()
    },
    onError: async (error) => {
      // The server's message says why (no lines, archived customer, …).
      toast.error(
        isAppError(error)
          ? error.message
          : 'Could not change the invoice. Try again.',
      )
      await invalidate()
    },
  })
}
