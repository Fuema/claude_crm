import {
  acceptInvitation,
  createWorkspace,
  getInvitation,
  getShell,
  inviteMember,
  listMembers,
  setActiveWorkspace,
} from '@/features/workspaces/server/workspace-service'
import { isAppError } from '@/lib/app-error'
import {
  activeWorkspaceId,
  createAuthTestKit,
  createSignedInUser,
  type TestUser,
} from '@/tests/auth-test-kit'

const kit = createAuthTestKit()

async function errorCode(promise: Promise<unknown>): Promise<string | false> {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  )
  return isAppError(error) && error.code
}

async function ownWorkspaceId(user: TestUser): Promise<string> {
  const id = await activeWorkspaceId(kit, user.headers)
  if (!id) {
    throw new Error('test user has no active workspace')
  }
  return id
}

describe('getShell', () => {
  it('lists the user’s workspaces and marks the active one', async () => {
    const ada = await createSignedInUser(kit, {
      name: 'Ada Lovelace',
      workspaceName: 'Engines',
    })
    const second = await createWorkspace(kit.auth, ada.headers, 'Looms')

    const shell = await getShell(
      kit.db,
      { id: ada.id, name: ada.name, email: ada.email },
      second.id,
    )
    expect(shell.workspaces.map((workspace) => workspace.name)).toEqual([
      'Engines',
      'Looms',
    ])
    expect(shell.activeWorkspace).toEqual(second)
  })

  it('has no active workspace for a user without one', async () => {
    const user = await createSignedInUser(kit, { name: 'No Workspace' })
    const shell = await getShell(kit.db, user, null)
    expect(shell.workspaces).toEqual([])
    expect(shell.activeWorkspace).toBeNull()
  })
})

describe('createWorkspace', () => {
  it('makes the new workspace active and its creator the owner', async () => {
    const ada = await createSignedInUser(kit, { workspaceName: 'First' })
    const workspace = await createWorkspace(kit.auth, ada.headers, 'Second')

    expect(await activeWorkspaceId(kit, ada.headers)).toBe(workspace.id)
    const { members } = await listMembers(kit.db, workspace.id)
    expect(members.map((member) => member.role)).toEqual(['owner'])
  })
})

describe('setActiveWorkspace', () => {
  it('refuses a workspace the user is not a member of', async () => {
    const ada = await createSignedInUser(kit, { workspaceName: 'Ada Co' })
    const bob = await createSignedInUser(kit, { workspaceName: 'Bob Co' })
    const bobsWorkspace = await ownWorkspaceId(bob)

    expect(
      await errorCode(setActiveWorkspace(kit.auth, ada.headers, bobsWorkspace)),
    ).toBe('NOT_FOUND')
  })
})

describe('invitations', () => {
  it('lets a plain member invite, and emails the invitation link', async () => {
    const owner = await createSignedInUser(kit, { workspaceName: 'Acme' })
    const tenantId = await ownWorkspaceId(owner)
    const member = await createSignedInUser(kit, { name: 'Mia Member' })
    await inviteMember(kit.auth, owner.headers, tenantId, member.email)
    const invitation = await kit.db.invitation.findFirstOrThrow({
      where: { email: member.email },
    })
    await acceptInvitation(kit.auth, member.headers, invitation.id)

    const invitee = 'newcomer@example.test'
    await inviteMember(kit.auth, member.headers, tenantId, invitee)

    const email = kit.sentEmails.find((sent) => sent.to === invitee)
    expect(email?.subject).toBe('Mia Member invited you to Acme on CRM')
    expect(email?.text).toMatch(
      /http:\/\/localhost:3000\/accept-invitation\/\S+/,
    )
  })

  it('refuses to invite an existing member or someone already invited', async () => {
    const owner = await createSignedInUser(kit, { workspaceName: 'Acme' })
    const tenantId = await ownWorkspaceId(owner)

    const ownerResult = await inviteMember(
      kit.auth,
      owner.headers,
      tenantId,
      owner.email,
    ).catch((caught: unknown) => caught)
    expect(isAppError(ownerResult) && ownerResult.details).toEqual({
      email: ['This person is already a member.'],
    })

    await inviteMember(kit.auth, owner.headers, tenantId, 'twice@example.test')
    const again = await inviteMember(
      kit.auth,
      owner.headers,
      tenantId,
      'twice@example.test',
    ).catch((caught: unknown) => caught)
    expect(isAppError(again) && again.details).toEqual({
      email: ['This person already has a pending invitation.'],
    })
  })

  it('shows the invitation only to the invited person, who can accept it once', async () => {
    const owner = await createSignedInUser(kit, { workspaceName: 'Acme' })
    const tenantId = await ownWorkspaceId(owner)
    const invitee = await createSignedInUser(kit, { name: 'Ivy Invitee' })
    const stranger = await createSignedInUser(kit, { name: 'Sam Stranger' })
    await inviteMember(kit.auth, owner.headers, tenantId, invitee.email)
    const { id } = await kit.db.invitation.findFirstOrThrow({
      where: { email: invitee.email },
    })

    expect(await errorCode(getInvitation(kit.auth, stranger.headers, id))).toBe(
      'NOT_FOUND',
    )
    expect(await getInvitation(kit.auth, invitee.headers, id)).toMatchObject({
      workspaceName: 'Acme',
      inviterEmail: owner.email,
    })

    const joined = await acceptInvitation(kit.auth, invitee.headers, id)
    expect(joined).toEqual({ id: tenantId, name: 'Acme' })
    expect(await activeWorkspaceId(kit, invitee.headers)).toBe(tenantId)
    expect(
      await errorCode(acceptInvitation(kit.auth, invitee.headers, id)),
    ).toBe('NOT_FOUND')
    // Better Auth answers this one without an error code.
    expect(await errorCode(getInvitation(kit.auth, invitee.headers, id))).toBe(
      'NOT_FOUND',
    )
  })
})

describe('listMembers', () => {
  it('lists members by name and only invitations that can still be accepted', async () => {
    const owner = await createSignedInUser(kit, {
      name: 'Zoe Owner',
      workspaceName: 'Acme',
    })
    const tenantId = await ownWorkspaceId(owner)
    const amy = await createSignedInUser(kit, { name: 'Amy Adams' })
    await inviteMember(kit.auth, owner.headers, tenantId, amy.email)
    const { id } = await kit.db.invitation.findFirstOrThrow({
      where: { email: amy.email },
    })
    await acceptInvitation(kit.auth, amy.headers, id)
    await inviteMember(kit.auth, owner.headers, tenantId, 'open@example.test')
    await inviteMember(kit.auth, owner.headers, tenantId, 'late@example.test')
    await kit.db.invitation.updateMany({
      where: { email: 'late@example.test', organizationId: tenantId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const overview = await listMembers(kit.db, tenantId)
    expect(
      overview.members.map((member) => [member.name, member.role]),
    ).toEqual([
      ['Amy Adams', 'member'],
      ['Zoe Owner', 'owner'],
    ])
    expect(overview.invitations.map((invitation) => invitation.email)).toEqual([
      'open@example.test',
    ])
  })

  it('never includes another workspace’s members or invitations', async () => {
    const ada = await createSignedInUser(kit, { workspaceName: 'Ada Co' })
    const bob = await createSignedInUser(kit, { workspaceName: 'Bob Co' })
    const adaTenant = await ownWorkspaceId(ada)
    const bobTenant = await ownWorkspaceId(bob)
    await inviteMember(kit.auth, bob.headers, bobTenant, 'bobs@example.test')

    const overview = await listMembers(kit.db, adaTenant)
    expect(overview.members.map((member) => member.email)).toEqual([ada.email])
    expect(overview.invitations).toEqual([])
  })
})
