import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  acceptInvitationFn,
  createWorkspaceFn,
  fetchInvitation,
  fetchMembers,
  inviteMemberFn,
  switchWorkspace,
} from '@/features/workspaces/server/workspace-functions'
import type {
  CreateWorkspaceValues,
  InviteMemberValues,
} from '@/features/workspaces/types/workspace'

/** Tenant data keys start with the workspace id (docs/data-and-api.md). */
export const workspaceKeys = {
  members: (tenantId: string) => ['tenant', tenantId, 'members'] as const,
  invitation: (invitationId: string) => ['invitation', invitationId] as const,
}

export function membersQueryOptions(tenantId: string) {
  return queryOptions({
    queryKey: workspaceKeys.members(tenantId),
    queryFn: () => fetchMembers(),
  })
}

export function useMembers(tenantId: string) {
  return useQuery(membersQueryOptions(tenantId))
}

export function useInviteMember(tenantId: string) {
  const invite = useServerFn(inviteMemberFn)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: InviteMemberValues) => invite({ data: values }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(tenantId),
      }),
  })
}

/**
 * After the active workspace changes, nothing cached for the old one may be
 * shown: clear the cache and re-run the route guards.
 */
function useEnterWorkspace() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return async () => {
    queryClient.clear()
    await router.invalidate()
    await router.navigate({ to: '/' })
  }
}

export function useSwitchWorkspace() {
  const switchTo = useServerFn(switchWorkspace)
  const enterWorkspace = useEnterWorkspace()
  return useMutation({
    mutationFn: (workspaceId: string) => switchTo({ data: { workspaceId } }),
    onSuccess: enterWorkspace,
  })
}

export function useCreateWorkspace() {
  const create = useServerFn(createWorkspaceFn)
  const enterWorkspace = useEnterWorkspace()
  return useMutation({
    mutationFn: (values: CreateWorkspaceValues) => create({ data: values }),
    onSuccess: enterWorkspace,
  })
}

export function useInvitation(invitationId: string, enabled: boolean) {
  return useQuery({
    queryKey: workspaceKeys.invitation(invitationId),
    queryFn: () => fetchInvitation({ data: { invitationId } }),
    enabled,
    retry: false,
  })
}

export function useAcceptInvitation() {
  const accept = useServerFn(acceptInvitationFn)
  const enterWorkspace = useEnterWorkspace()
  return useMutation({
    mutationFn: (invitationId: string) => accept({ data: { invitationId } }),
    onSuccess: enterWorkspace,
  })
}
