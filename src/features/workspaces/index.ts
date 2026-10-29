export { WorkspaceSwitcher } from '@/features/workspaces/components/workspace-switcher'
export {
  membersQueryOptions,
  useSwitchWorkspace,
} from '@/features/workspaces/hooks/use-workspaces'
export { AcceptInvitationPage } from '@/features/workspaces/pages/accept-invitation-page'
export { CreateWorkspacePage } from '@/features/workspaces/pages/create-workspace-page'
export { MembersPage } from '@/features/workspaces/pages/members-page'
export {
  fetchShell,
  switchWorkspace,
} from '@/features/workspaces/server/workspace-functions'
export type {
  Shell,
  WorkspaceSummary,
} from '@/features/workspaces/types/workspace'
