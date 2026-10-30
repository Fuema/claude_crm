import type {
  InvitationDetails,
  MembersOverview,
  Shell,
  ShellUser,
  WorkspaceRole,
  WorkspaceSummary,
} from '@/features/workspaces/types/workspace'
import { AppError } from '@/lib/app-error'
import type { Auth } from '@/server/auth'
import {
  betterAuthErrorCode,
  isBetterAuthApiError,
} from '@/server/better-auth-errors'
import type { Db } from '@/server/db'
import { workspaceSlug } from '@/server/workspaces'

export async function getShell(
  db: Db,
  user: ShellUser,
  activeWorkspaceId: string | null,
): Promise<Shell> {
  const memberships = await db.member.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    select: { organization: { select: { id: true, name: true } } },
  })
  const workspaces: WorkspaceSummary[] = memberships.map(
    ({ organization }) => organization,
  )
  return {
    user,
    activeWorkspace:
      workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
      null,
    workspaces,
  }
}

/** Members by name, and invitations that can still be accepted. */
export async function listMembers(
  db: Db,
  tenantId: string,
  now = new Date(),
): Promise<MembersOverview> {
  const [members, invitations] = await Promise.all([
    db.member.findMany({
      where: { organizationId: tenantId },
      orderBy: { user: { name: 'asc' } },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    db.invitation.findMany({
      where: {
        organizationId: tenantId,
        status: 'pending',
        expiresAt: { gt: now },
      },
      orderBy: { email: 'asc' },
      select: { id: true, email: true, expiresAt: true },
    }),
  ])
  return {
    members: members.map((member) => ({
      id: member.id,
      name: member.user.name,
      email: member.user.email,
      role: toRole(member.role),
      joinedAt: member.createdAt.toISOString(),
    })),
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      expiresAt: invitation.expiresAt.toISOString(),
    })),
  }
}

function toRole(role: string): WorkspaceRole {
  return role === 'owner' || role === 'admin' ? role : 'member'
}

/** Creates a workspace owned by the signed-in user and makes it active. */
export async function createWorkspace(
  auth: Auth,
  headers: Headers,
  name: string,
): Promise<WorkspaceSummary> {
  const workspace = await auth.api.createOrganization({
    body: { name, slug: workspaceSlug(name) },
    headers,
  })
  if (!workspace) {
    throw new Error('Better Auth did not return the created workspace')
  }
  await setActiveWorkspace(auth, headers, workspace.id)
  return { id: workspace.id, name: workspace.name }
}

/** Better Auth checks that the user is a member before switching. */
export async function setActiveWorkspace(
  auth: Auth,
  headers: Headers,
  workspaceId: string,
): Promise<void> {
  try {
    await auth.api.setActiveOrganization({
      body: { organizationId: workspaceId },
      headers,
    })
  } catch (error) {
    if (isBetterAuthApiError(error)) {
      throw notFound('This workspace does not exist.', error)
    }
    throw error
  }
}

const INVITE_FIELD_ERRORS: Record<string, string> = {
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION:
    'This person is already a member.',
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION:
    'This person already has a pending invitation.',
}

/** Invites by email as a member; Better Auth sends the email (rule 19). */
export async function inviteMember(
  auth: Auth,
  headers: Headers,
  tenantId: string,
  email: string,
): Promise<void> {
  try {
    await auth.api.createInvitation({
      body: { email, role: 'member', organizationId: tenantId },
      headers,
    })
  } catch (error) {
    const message = INVITE_FIELD_ERRORS[betterAuthErrorCode(error) ?? '']
    if (message) {
      throw new AppError(
        { code: 'VALIDATION_FAILED', message, details: { email: [message] } },
        { cause: error },
      )
    }
    throw error
  }
}

const INVITATION_UNAVAILABLE =
  'This invitation is invalid, has expired, or was sent to another email.'

/** Only the invited (signed-in) person can see the invitation. */
export async function getInvitation(
  auth: Auth,
  headers: Headers,
  invitationId: string,
): Promise<InvitationDetails> {
  try {
    const invitation = await auth.api.getInvitation({
      query: { id: invitationId },
      headers,
    })
    return {
      id: invitation.id,
      workspaceName: invitation.organizationName,
      inviterEmail: invitation.inviterEmail,
      email: invitation.email,
    }
  } catch (error) {
    if (isBetterAuthApiError(error)) {
      throw notFound(INVITATION_UNAVAILABLE, error)
    }
    throw error
  }
}

/** Joins the workspace and makes it active. */
export async function acceptInvitation(
  auth: Auth,
  headers: Headers,
  invitationId: string,
): Promise<WorkspaceSummary> {
  let workspaceId: string
  try {
    const result = await auth.api.acceptInvitation({
      body: { invitationId },
      headers,
    })
    if (!result) {
      throw notFound(INVITATION_UNAVAILABLE)
    }
    workspaceId = result.invitation.organizationId
  } catch (error) {
    if (isBetterAuthApiError(error)) {
      throw notFound(INVITATION_UNAVAILABLE, error)
    }
    throw error
  }
  await setActiveWorkspace(auth, headers, workspaceId)
  const workspace = await auth.api.getFullOrganization({
    query: { organizationId: workspaceId },
    headers,
  })
  return { id: workspaceId, name: workspace?.name ?? '' }
}

function notFound(message: string, cause?: unknown): AppError {
  return new AppError({ code: 'NOT_FOUND', message }, { cause })
}
