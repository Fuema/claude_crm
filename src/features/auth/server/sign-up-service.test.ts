import { signUp } from '@/features/auth/server/sign-up-service'
import { workspaceSlug } from '@/server/workspaces'
import { createAuthTestKit, uniqueEmail } from '@/tests/auth-test-kit'

const kit = createAuthTestKit()

function signUpInput(overrides: Partial<Parameters<typeof signUp>[2]> = {}) {
  return {
    name: 'Ada Lovelace',
    email: uniqueEmail('ada'),
    password: 'correct horse',
    workspaceName: 'Analytical Engines',
    ...overrides,
  }
}

describe('signUp', () => {
  it('creates an unverified user who owns a new workspace', async () => {
    const input = signUpInput()
    await signUp(kit.auth, kit.db, input)

    const user = await kit.db.user.findUniqueOrThrow({
      where: { email: input.email },
      include: { members: { include: { organization: true } } },
    })
    expect(user.emailVerified).toBe(false)
    expect(user.members).toHaveLength(1)
    expect(user.members[0]?.role).toBe('owner')
    expect(user.members[0]?.organization.name).toBe('Analytical Engines')
  })

  it('sends a verification email that leads back to the app', async () => {
    const input = signUpInput()
    await signUp(kit.auth, kit.db, input)

    const email = kit.sentEmails.find((sent) => sent.to === input.email)
    expect(email?.subject).toBe('Verify your email for CRM')
    expect(email?.text).toContain('callbackURL=%2F')
  })

  it('creates no workspace for a user who came from an invitation', async () => {
    const input = signUpInput({
      workspaceName: undefined,
      invitationId: 'inv_123',
    })
    await signUp(kit.auth, kit.db, input)

    const user = await kit.db.user.findUniqueOrThrow({
      where: { email: input.email },
      include: { members: true },
    })
    expect(user.members).toHaveLength(0)
    const email = kit.sentEmails.find((sent) => sent.to === input.email)
    expect(email?.text).toContain(
      encodeURIComponent('/accept-invitation/inv_123'),
    )
  })

  it('does not reveal an existing account and creates nothing for it', async () => {
    const input = signUpInput()
    await signUp(kit.auth, kit.db, input)

    await expect(
      signUp(kit.auth, kit.db, {
        ...input,
        name: 'Someone else',
        workspaceName: 'Hijack',
      }),
    ).resolves.toBeUndefined()

    const owners = await kit.db.member.findMany({
      where: { user: { email: input.email } },
      include: { organization: true },
    })
    expect(owners.map((member) => member.organization.name)).toEqual([
      'Analytical Engines',
    ])
    const notices = kit.sentEmails.filter(
      (sent) =>
        sent.to === input.email &&
        sent.subject === 'Someone tried to sign up with your email',
    )
    expect(notices).toHaveLength(1)
  })
})

describe('workspaceSlug', () => {
  it('starts with a readable version of the name', () => {
    expect(workspaceSlug('Café Müller & Co.')).toMatch(
      /^cafe-muller-co-[0-9a-f]{8}$/,
    )
  })

  it('is unique even for the same name', () => {
    expect(workspaceSlug('Acme')).not.toBe(workspaceSlug('Acme'))
  })
})
