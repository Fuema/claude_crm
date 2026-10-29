import { isAppError } from '@/lib/app-error'
import { resolveTenantId } from '@/server/middleware/auth'
import {
  activeWorkspaceId,
  createAuthTestKit,
  createSignedInUser,
} from '@/tests/auth-test-kit'

const kit = createAuthTestKit()

async function errorCode(promise: Promise<unknown>): Promise<string | false> {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  )
  return isAppError(error) && error.code
}

describe('resolveTenantId', () => {
  it('returns the active workspace of a member', async () => {
    const ada = await createSignedInUser(kit, { workspaceName: 'Ada Co' })
    const active = await activeWorkspaceId(kit, ada.headers)

    await expect(resolveTenantId(kit.db, ada.id, active)).resolves.toBe(active)
  })

  it('rejects a session without an active workspace', async () => {
    const user = await createSignedInUser(kit, { name: 'No Workspace' })
    expect(await errorCode(resolveTenantId(kit.db, user.id, null))).toBe(
      'NO_ACTIVE_WORKSPACE',
    )
  })

  it('rejects a workspace the user is not (or no longer) a member of', async () => {
    const ada = await createSignedInUser(kit, { workspaceName: 'Ada Co' })
    const bob = await createSignedInUser(kit, { workspaceName: 'Bob Co' })
    const bobsWorkspace = await activeWorkspaceId(kit, bob.headers)

    expect(
      await errorCode(resolveTenantId(kit.db, ada.id, bobsWorkspace)),
    ).toBe('NO_ACTIVE_WORKSPACE')
  })
})
