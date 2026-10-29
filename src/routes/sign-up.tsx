import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { RouteError } from '@/components/route-error'
import { SignUpPage } from '@/features/auth'

const searchSchema = z.object({
  invitation: z.string().min(1).optional().catch(undefined),
})

export const Route = createFileRoute('/sign-up')({
  validateSearch: searchSchema,
  component: SignUpRoute,
  errorComponent: (props) => <RouteError {...props} landmark />,
})

function SignUpRoute() {
  const { invitation } = Route.useSearch()
  return <SignUpPage invitationId={invitation} />
}
