import type { SignUpValues } from '@/features/auth/types/auth-schemas'
import type { Auth } from '@/server/auth'
import type { Db } from '@/server/db'
import { createOwnedWorkspace } from '@/server/workspaces'

/**
 * Creates the account (Better Auth sends the verification email) and, unless
 * the user came from an invitation, the workspace they own (rule 18).
 *
 * The result never reveals whether the email already had an account (rule
 * 16): Better Auth then returns a synthetic user and emails the real owner
 * instead, and no workspace is created.
 */
export async function signUp(
  auth: Auth,
  db: Db,
  input: SignUpValues,
): Promise<void> {
  const callbackURL = input.invitationId
    ? `/accept-invitation/${input.invitationId}`
    : '/'

  const result = await auth.api.signUpEmail({
    body: {
      name: input.name,
      email: input.email,
      password: input.password,
      callbackURL,
    },
  })

  if (input.invitationId || !input.workspaceName) {
    return
  }
  const created = await db.user.findUnique({
    where: { id: result.user.id },
    select: { id: true },
  })
  if (created) {
    await createOwnedWorkspace(auth, created.id, input.workspaceName)
  }
}
