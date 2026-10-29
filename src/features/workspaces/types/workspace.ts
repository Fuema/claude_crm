import { z } from 'zod'
import { workspaceNameSchema } from '@/lib/workspace-name'

export interface WorkspaceSummary {
  id: string
  name: string
}

export interface ShellUser {
  id: string
  name: string
  email: string
}

/** What the app shell needs on every page. */
export interface Shell {
  user: ShellUser
  activeWorkspace: WorkspaceSummary | null
  workspaces: WorkspaceSummary[]
}

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export interface WorkspaceMember {
  id: string
  name: string
  email: string
  role: WorkspaceRole
  /** ISO date-time. */
  joinedAt: string
}

export interface PendingInvitation {
  id: string
  email: string
  /** ISO date-time. */
  expiresAt: string
}

export interface MembersOverview {
  members: WorkspaceMember[]
  invitations: PendingInvitation[]
}

export interface InvitationDetails {
  id: string
  workspaceName: string
  inviterEmail: string
  email: string
}

export const createWorkspaceSchema = z.object({ name: workspaceNameSchema })
export type CreateWorkspaceValues = z.infer<typeof createWorkspaceSchema>

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .pipe(z.email('Enter a valid email')),
})
export type InviteMemberValues = z.infer<typeof inviteMemberSchema>

export const workspaceIdSchema = z.object({ workspaceId: z.string().min(1) })
export const invitationIdSchema = z.object({ invitationId: z.string().min(1) })
