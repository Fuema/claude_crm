import { createFileRoute } from '@tanstack/react-router'
import { MembersPage, membersQueryOptions } from '@/features/workspaces'

export const Route = createFileRoute('/_authenticated/members')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      membersQueryOptions(context.workspace.id),
    ),
  component: MembersPage,
})
