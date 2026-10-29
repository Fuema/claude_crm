import { workspaceRoles } from '@/server/auth-roles'

describe('workspaceRoles', () => {
  it('lets a member invite others', () => {
    expect(
      workspaceRoles.member.authorize({ invitation: ['create'] }).success,
    ).toBe(true)
  })

  it('does not let a member manage members, cancel invitations, or the workspace', () => {
    const { member } = workspaceRoles
    expect(member.authorize({ member: ['delete'] }).success).toBe(false)
    expect(member.authorize({ invitation: ['cancel'] }).success).toBe(false)
    expect(member.authorize({ organization: ['update'] }).success).toBe(false)
  })

  it("keeps Better Auth's owner and admin permissions", () => {
    expect(
      workspaceRoles.owner.authorize({ organization: ['delete'] }).success,
    ).toBe(true)
    expect(
      workspaceRoles.admin.authorize({ organization: ['delete'] }).success,
    ).toBe(false)
    expect(
      workspaceRoles.admin.authorize({ member: ['create', 'delete'] }).success,
    ).toBe(true)
  })
})
