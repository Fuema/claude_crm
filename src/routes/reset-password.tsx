import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { RouteError } from '@/components/route-error'
import { ResetPasswordPage } from '@/features/auth'

// Better Auth redirects here from the emailed link with `token`, or with
// `error` when the link is invalid or expired.
const searchSchema = z.object({
  token: z.string().min(1).optional().catch(undefined),
  error: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/reset-password')({
  validateSearch: searchSchema,
  component: ResetPasswordRoute,
  errorComponent: (props) => <RouteError {...props} landmark />,
})

function ResetPasswordRoute() {
  const { token, error } = Route.useSearch()
  return <ResetPasswordPage token={token} linkError={error} />
}
