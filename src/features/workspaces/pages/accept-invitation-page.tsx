import { Link } from '@tanstack/react-router'
import { CenteredCard } from '@/components/centered-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAcceptInvitation,
  useInvitation,
} from '@/features/workspaces/hooks/use-workspaces'
import { errorMessage } from '@/lib/error-message'

interface AcceptInvitationPageProps {
  invitationId: string
  /** Null when signed out: the invitation can only be read once signed in. */
  signedInEmail: string | null
}

export function AcceptInvitationPage({
  invitationId,
  signedInEmail,
}: AcceptInvitationPageProps) {
  if (!signedInEmail) {
    return <SignedOutInvitation invitationId={invitationId} />
  }
  return (
    <SignedInInvitation
      invitationId={invitationId}
      signedInEmail={signedInEmail}
    />
  )
}

function SignedOutInvitation({ invitationId }: { invitationId: string }) {
  const returnTo = `/accept-invitation/${invitationId}`
  return (
    <CenteredCard
      title="You have been invited"
      description="Sign in or create an account with the email the invitation was sent to."
    >
      <Button asChild>
        <Link to="/sign-up" search={{ invitation: invitationId }}>
          Create an account
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/sign-in" search={{ redirect: returnTo }}>
          Sign in
        </Link>
      </Button>
    </CenteredCard>
  )
}

function SignedInInvitation({
  invitationId,
  signedInEmail,
}: {
  invitationId: string
  signedInEmail: string
}) {
  const invitation = useInvitation(invitationId, true)
  const accept = useAcceptInvitation()

  if (invitation.isPending) {
    return (
      <CenteredCard title="Invitation">
        <span role="status" className="sr-only">
          Loading the invitation
        </span>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-9 w-full" />
      </CenteredCard>
    )
  }

  if (invitation.error) {
    return (
      <CenteredCard
        title="This invitation does not work"
        footer={
          <Link to="/" className="underline underline-offset-4">
            Go to the app
          </Link>
        }
      >
        <p role="alert">{errorMessage(invitation.error)}</p>
        <p className="text-sm text-muted-foreground">
          You are signed in as {signedInEmail}.
        </p>
      </CenteredCard>
    )
  }

  const { workspaceName, inviterEmail } = invitation.data
  return (
    <CenteredCard
      title={`Join ${workspaceName}`}
      description={`${inviterEmail} invited you to this workspace.`}
    >
      <Button
        disabled={accept.isPending}
        onClick={() => accept.mutate(invitationId)}
      >
        {accept.isPending ? 'Joining…' : 'Accept invitation'}
      </Button>
      {accept.error && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(accept.error)}
        </p>
      )}
    </CenteredCard>
  )
}
