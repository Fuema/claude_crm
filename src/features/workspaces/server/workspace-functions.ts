import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import {
  acceptInvitation,
  createWorkspace,
  getInvitation,
  getShell,
  inviteMember,
  listMembers,
  setActiveWorkspace,
} from '@/features/workspaces/server/workspace-service'
import {
  createWorkspaceSchema,
  invitationIdSchema,
  inviteMemberSchema,
  type Shell,
  workspaceIdSchema,
} from '@/features/workspaces/types/workspace'
import { getAuth } from '@/server/auth'
import { withDb } from '@/server/db'
import { authMiddleware, tenantMiddleware } from '@/server/middleware/auth'
import { validateInput } from '@/server/validate'

/**
 * The session check used by route guards: null when signed out, so it is the
 * one server function without auth middleware (docs/security.md).
 */
export const fetchShell = createServerFn({ method: 'GET' }).handler(
  (): Promise<Shell | null> =>
    withDb(async (db) => {
      const session = await getAuth(db).api.getSession({
        headers: new Headers(getRequestHeaders()),
      })
      if (!session) {
        return null
      }
      const { id, name, email } = session.user
      return getShell(
        db,
        { id, name, email },
        session.session.activeOrganizationId ?? null,
      )
    }),
)

export const switchWorkspace = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(validateInput(workspaceIdSchema))
  .handler(({ data, context }) =>
    setActiveWorkspace(context.auth, context.headers, data.workspaceId),
  )

export const createWorkspaceFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(validateInput(createWorkspaceSchema))
  .handler(({ data, context }) =>
    createWorkspace(context.auth, context.headers, data.name),
  )

export const fetchMembers = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .handler(({ context }) => listMembers(context.db, context.tenantId))

export const inviteMemberFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(inviteMemberSchema))
  .handler(({ data, context }) =>
    inviteMember(context.auth, context.headers, context.tenantId, data.email),
  )

export const fetchInvitation = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(validateInput(invitationIdSchema))
  .handler(({ data, context }) =>
    getInvitation(context.auth, context.headers, data.invitationId),
  )

export const acceptInvitationFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(validateInput(invitationIdSchema))
  .handler(({ data, context }) =>
    acceptInvitation(context.auth, context.headers, data.invitationId),
  )
