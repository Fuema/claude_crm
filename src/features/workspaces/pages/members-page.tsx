import { getRouteApi } from '@tanstack/react-router'
import { MailIcon, UserPlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { FormDialog } from '@/components/form-dialog'
import { GenericTable } from '@/components/generic-table'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { memberColumns } from '@/features/workspaces/components/member-columns'
import { InviteMemberForm } from '@/features/workspaces/components/workspace-forms'
import {
  useInviteMember,
  useMembers,
} from '@/features/workspaces/hooks/use-workspaces'
import type { InviteMemberValues } from '@/features/workspaces/types/workspace'
import { errorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'

const authenticatedRoute = getRouteApi('/_authenticated')

export function MembersPage() {
  const { workspace } = authenticatedRoute.useRouteContext()
  const members = useMembers(workspace.id)
  const invite = useInviteMember(workspace.id)
  const [isInviteOpen, setInviteOpen] = useState(false)
  const formId = useId()

  async function handleInvite(values: InviteMemberValues) {
    await invite.mutateAsync(values)
    setInviteOpen(false)
    toast.success(`Invitation sent to ${values.email}`)
  }

  const invitations = members.data?.invitations ?? []
  return (
    <>
      <PageHeader
        title="Members"
        description={`Everyone who works in ${workspace.name}.`}
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlusIcon aria-hidden="true" />
            Invite member
          </Button>
        }
      />
      <GenericTable
        caption="Members"
        searchLabel="Search members"
        columns={memberColumns}
        data={members.data?.members ?? []}
        getRowId={(member) => member.id}
        isLoading={members.isPending}
        errorMessage={members.error ? errorMessage(members.error) : undefined}
        onRetry={() => void members.refetch()}
      />
      {invitations.length > 0 && (
        <section aria-labelledby="pending-invitations" className="mt-8">
          <h2 id="pending-invitations" className="mb-3 text-lg font-semibold">
            Pending invitations
          </h2>
          <ul className="divide-y rounded-md border">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3"
              >
                <MailIcon
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                <span className="break-all">{invitation.email}</span>
                <span className="text-sm text-muted-foreground">
                  Expires {formatDate(invitation.expiresAt.slice(0, 10))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <FormDialog
        open={isInviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite member"
        description="We will email them a link to join this workspace. The link is valid for 48 hours."
        formId={formId}
        submitLabel="Send invitation"
        isPending={invite.isPending}
      >
        <InviteMemberForm formId={formId} onSubmit={handleInvite} />
      </FormDialog>
    </>
  )
}
