import { signUp } from '@/features/auth/server/sign-up-service'
import { createAuth } from '@/server/auth'
import { type Db, getDb } from '@/server/db'
import type { Email } from '@/server/email'

export const TEST_PASSWORD = 'correct horse battery'

/**
 * Better Auth on the test database, with emails captured instead of sent.
 * Each test file creates its own kit.
 */
export function createAuthTestKit() {
  const db = getDb()
  const sentEmails: Email[] = []
  const auth = createAuth({
    db,
    env: {
      BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters',
      BETTER_AUTH_URL: 'http://localhost:3000',
    },
    sendEmail: async (email) => {
      sentEmails.push(email)
    },
  })
  return { auth, db, sentEmails }
}

export type AuthTestKit = ReturnType<typeof createAuthTestKit>

export function uniqueEmail(label = 'user'): string {
  return `${label}-${crypto.randomUUID().slice(0, 8)}@example.test`
}

export interface TestUser {
  id: string
  name: string
  email: string
  headers: Headers
}

/**
 * A verified, signed-in user. With `workspaceName` they own that workspace
 * (it becomes their active one); without it they belong to none.
 */
export async function createSignedInUser(
  kit: AuthTestKit,
  options: { name?: string; workspaceName?: string } = {},
): Promise<TestUser> {
  const name = options.name ?? 'Test User'
  const email = uniqueEmail(name.split(' ')[0]?.toLowerCase())
  await signUp(kit.auth, kit.db, {
    name,
    email,
    password: TEST_PASSWORD,
    workspaceName: options.workspaceName,
  })
  const headers = await signedInHeaders(kit, email, TEST_PASSWORD)
  const user = await kit.db.user.findUniqueOrThrow({ where: { email } })
  return { id: user.id, name, email, headers }
}

/** Signs a verified user in and returns request headers carrying the session. */
export async function signedInHeaders(
  kit: AuthTestKit,
  email: string,
  password: string,
): Promise<Headers> {
  await markEmailVerified(kit.db, email)
  const result = await kit.auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  })
  const cookie = result.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  return new Headers({ cookie })
}

export async function markEmailVerified(db: Db, email: string): Promise<void> {
  await db.user.update({ where: { email }, data: { emailVerified: true } })
}

/** The session's active workspace id, as the middleware would read it. */
export async function activeWorkspaceId(
  kit: AuthTestKit,
  headers: Headers,
): Promise<string | null> {
  const session = await kit.auth.api.getSession({ headers })
  return session?.session.activeOrganizationId ?? null
}
