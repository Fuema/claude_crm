import {
  createAccessControl,
  type Statements,
} from 'better-auth/plugins/access'
import {
  adminAc,
  defaultStatements,
  ownerAc,
} from 'better-auth/plugins/organization/access'

// Typed as plain `Statements`: Better Auth's `ac` option expects
// AccessControl<Statements>, which TypeScript 7 does not accept for the
// narrower default type. auth-roles.test.ts checks the permissions instead.
export const accessControl = createAccessControl<Statements>(defaultStatements)

export const workspaceRoles = {
  owner: accessControl.newRole(ownerAc.statements),
  admin: accessControl.newRole(adminAc.statements),
  /**
   * Members may invite others (docs/project.md, rules 1 and 19). Better
   * Auth's default member role cannot.
   */
  member: accessControl.newRole({ invitation: ['create'], ac: ['read'] }),
}
