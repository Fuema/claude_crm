import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { AppError } from '@/lib/app-error'
import { getAuth } from '@/server/auth'
import { type Db, getDb } from '@/server/db'
import { getTenantScope } from '@/server/tenant-db'

export interface SessionUser {
  id: string
  name: string
  email: string
}

/**
 * Requires a signed-in user. Puts the request's Better Auth instance, the db,
 * the user, and the active workspace id (possibly null) in the context.
 */
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const headers = new Headers(getRequestHeaders())
    const db = getDb()
    const auth = getAuth(db)
    const session = await auth.api.getSession({ headers })
    if (!session) {
      throw new AppError({
        code: 'UNAUTHENTICATED',
        message: 'Sign in to continue.',
      })
    }
    const { id, name, email } = session.user
    return next({
      context: {
        auth,
        db,
        headers,
        user: { id, name, email } satisfies SessionUser,
        activeWorkspaceId: session.session.activeOrganizationId ?? null,
      },
    })
  },
)

/**
 * Requires an active workspace the user is still a member of, and puts its id
 * (`tenantId`) and the scoped client (`tenant`, for feature services) in the
 * context. The id comes from the server-side session,
 * never from input (docs/security.md).
 */
export const tenantMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    const tenantId = await resolveTenantId(
      context.db,
      context.user.id,
      context.activeWorkspaceId,
    )
    return next({
      context: { tenantId, tenant: getTenantScope(tenantId, context.db) },
    })
  })

export async function resolveTenantId(
  db: Db,
  userId: string,
  activeWorkspaceId: string | null,
): Promise<string> {
  const membership = activeWorkspaceId
    ? await db.member.findFirst({
        where: { userId, organizationId: activeWorkspaceId },
        select: { organizationId: true },
      })
    : null
  if (!membership) {
    throw new AppError({
      code: 'NO_ACTIVE_WORKSPACE',
      message: 'Choose a workspace to continue.',
    })
  }
  return membership.organizationId
}
