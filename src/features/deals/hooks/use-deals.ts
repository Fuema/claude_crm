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
  changeDealStageFn,
  createDealFn,
  deleteDealFn,
  fetchBoardDeals,
  fetchCustomerDeals,
  fetchDeal,
  fetchDeals,
  updateDealFn,
} from '@/features/deals/server/deal-functions'
import {
  DEAL_STAGE_LABELS,
  type Deal,
  type DealStage,
} from '@/features/deals/types/deal'
import type { DealFormValues } from '@/features/deals/types/deal-form-schema'
import type { DealListParams } from '@/features/deals/types/deal-search'
import { useWorkspaceId } from '@/hooks/use-workspace-id'
import { isAppError } from '@/lib/app-error'
import { workspaceKey } from '@/lib/query-keys'
import type { LookupOption } from '@/types/lookup-option'

/** Keys start with the workspace id (docs/data-and-api.md). */
export const dealKeys = {
  all: (tenantId: string) => [...workspaceKey(tenantId), 'deals'] as const,
  /** Every list of deals: pages, a customer's deals, the board. */
  lists: (tenantId: string) => [...dealKeys.all(tenantId), 'list'] as const,
  list: (tenantId: string, params: DealListParams) =>
    [...dealKeys.lists(tenantId), params] as const,
  byCustomer: (tenantId: string, customerId: string) =>
    [...dealKeys.lists(tenantId), 'customer', customerId] as const,
  board: (tenantId: string, customerId: string | undefined) =>
    [...dealKeys.lists(tenantId), 'board', customerId ?? 'all'] as const,
  detail: (tenantId: string, id: string) =>
    [...dealKeys.all(tenantId), 'detail', id] as const,
}

export function dealsQueryOptions(tenantId: string, params: DealListParams) {
  return queryOptions({
    queryKey: dealKeys.list(tenantId, params),
    queryFn: () => fetchDeals({ data: params }),
    placeholderData: keepPreviousData,
  })
}

/**
 * Every deal (or one customer's), for the pipeline board. No placeholder
 * data: another customer's deals must never show under the new filter.
 */
export function boardDealsQueryOptions(
  tenantId: string,
  customerId: string | undefined,
) {
  return queryOptions({
    queryKey: dealKeys.board(tenantId, customerId),
    queryFn: () => fetchBoardDeals({ data: { customerId } }),
  })
}

export function dealQueryOptions(tenantId: string, dealId: string) {
  return queryOptions({
    queryKey: dealKeys.detail(tenantId, dealId),
    queryFn: () => fetchDeal({ data: { dealId } }),
  })
}

/** One page of the deal list; keeps the previous page while the next loads. */
export function useDeals(params: DealListParams) {
  return useQuery(dealsQueryOptions(useWorkspaceId(), params))
}

/** Every deal of one customer, for the table that searches and sorts in the browser. */
export function useCustomerDeals(customerId: string) {
  const tenantId = useWorkspaceId()
  return useQuery({
    queryKey: dealKeys.byCustomer(tenantId, customerId),
    queryFn: () => fetchCustomerDeals({ data: { customerId } }),
  })
}

/**
 * The deals of one customer for a picker (e.g. an activity's deal); shares
 * the cache of the customer's Deals section. Idle without a customer.
 */
export function useDealOptions(customerId: string | undefined) {
  const tenantId = useWorkspaceId()
  return useQuery({
    queryKey: dealKeys.byCustomer(tenantId, customerId ?? ''),
    queryFn: () =>
      fetchCustomerDeals({ data: { customerId: customerId ?? '' } }),
    enabled: Boolean(customerId),
    select: (deals): LookupOption[] =>
      deals.map((deal) => ({ id: deal.id, name: deal.title })),
  })
}

export function useBoardDeals(customerId: string | undefined) {
  return useQuery(boardDealsQueryOptions(useWorkspaceId(), customerId))
}

export function useDeal(dealId: string) {
  return useQuery({
    ...dealQueryOptions(useWorkspaceId(), dealId),
    retry: (failureCount, error) => !isDealGone(error) && failureCount < 2,
  })
}

function useInvalidateDeals() {
  const queryClient = useQueryClient()
  const tenantId = useWorkspaceId()
  // Other features show deals (an activity's deal), so refresh everything
  // of the workspace.
  return () =>
    queryClient.invalidateQueries({ queryKey: workspaceKey(tenantId) })
}

// Create and update toast on success only. Their failures are shown inside
// the open form (see DealForm). Stage changes and delete have no form, so
// they toast both ways.

export function useCreateDeal() {
  const create = useServerFn(createDealFn)
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: (values: DealFormValues) => create({ data: values }),
    onSuccess: async (deal) => {
      toast.success(`Deal added: ${deal.title}`)
      await invalidate()
    },
  })
}

export function useUpdateDeal() {
  const update = useServerFn(updateDealFn)
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: ({
      id,
      values: { customerId: _, ...values },
    }: {
      id: string
      values: DealFormValues
    }) => update({ data: { ...values, dealId: id } }),
    onSuccess: async () => {
      toast.success('Changes saved')
      await invalidate()
    },
  })
}

export function useChangeDealStage() {
  const change = useServerFn(changeDealStageFn)
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: ({ deal, stage }: { deal: Deal; stage: DealStage }) =>
      change({ data: { dealId: deal.id, stage } }),
    onSuccess: async (deal) => {
      toast.success(`${deal.title} moved to ${DEAL_STAGE_LABELS[deal.stage]}`)
      await invalidate()
    },
    onError: async (error, { deal }) => {
      toast.error(
        failureMessage(error, `Could not move ${deal.title}. Try again.`),
      )
      await invalidate()
    },
  })
}

/**
 * Clears the cache after a deal was deleted. The detail is dropped only when
 * no page shows it: the details page navigates away itself, and removing
 * its query first would refetch a deal that no longer exists.
 */
function useForgetDeal() {
  const queryClient = useQueryClient()
  const tenantId = useWorkspaceId()
  return async (deal: Deal) => {
    queryClient.removeQueries({
      queryKey: dealKeys.detail(tenantId, deal.id),
      type: 'inactive',
    })
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: dealKeys.detail(tenantId, deal.id),
        refetchType: 'none',
      }),
      // Lists, and other features showing the deal (activities).
      queryClient.invalidateQueries({ queryKey: workspaceKey(tenantId) }),
    ])
  }
}

export function useDeleteDeal() {
  const remove = useServerFn(deleteDealFn)
  const forget = useForgetDeal()
  return useMutation({
    mutationFn: (deal: Deal) => remove({ data: { dealId: deal.id } }),
    onSuccess: async (_, deal) => {
      toast.success(`Deal deleted: ${deal.title}`)
      await forget(deal)
    },
    onError: async (error, deal) => {
      if (isDealGone(error)) {
        toast.error(`${deal.title} was already deleted.`)
        await forget(deal)
        return
      }
      toast.error(
        failureMessage(error, `Could not delete ${deal.title}. Try again.`),
      )
    },
  })
}

/** The server's own message for an archived customer, otherwise `fallback`. */
function failureMessage(error: unknown, fallback: string): string {
  return isAppError(error) && error.code === 'CUSTOMER_ARCHIVED'
    ? error.message
    : fallback
}

/** The deal does not exist (anymore), e.g. someone else deleted it. */
export function isDealGone(error: unknown): boolean {
  return isAppError(error) && error.code === 'NOT_FOUND'
}
