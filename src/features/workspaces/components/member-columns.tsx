import { createGenericTableColumnHelper } from '@/components/generic-table'
import type {
  WorkspaceMember,
  WorkspaceRole,
} from '@/features/workspaces/types/workspace'
import { formatDate } from '@/lib/format'

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

const helper = createGenericTableColumnHelper<WorkspaceMember>()

/**
 * Dates are shown as the UTC calendar day, so the server-rendered page and
 * the browser agree (no hydration mismatch across time zones).
 */
export const memberColumns = helper.columns([
  helper.accessor('name', {
    header: 'Name',
    enableSorting: true,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  }),
  helper.accessor('email', { header: 'Email', enableSorting: true }),
  helper.accessor((member) => ROLE_LABELS[member.role], {
    id: 'role',
    header: 'Role',
  }),
  helper.accessor('joinedAt', {
    header: 'Joined',
    enableSorting: true,
    cell: ({ row }) => formatDate(row.original.joinedAt.slice(0, 10)),
  }),
])
