import { createFileRoute } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { AcceptInvitationPage, fetchShell } from '@/features/workspaces'

export const Route = createFileRoute('/accept-invitation/$invitationId')({
  beforeLoad: async () => {
    const shell = await fetchShell()
    return { signedInEmail: shell?.user.email ?? null }
  },
  component: AcceptInvitationRoute,
  errorComponent: (props) => <RouteError {...props} landmark />,
})

function AcceptInvitationRoute() {
  const { invitationId } = Route.useParams()
  const { signedInEmail } = Route.useRouteContext()
  return (
    <AcceptInvitationPage
      invitationId={invitationId}
      signedInEmail={signedInEmail}
    />
  )
}
