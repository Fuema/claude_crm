import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { RouteError } from '@/components/route-error'
import { SignInPage } from '@/features/auth'
import { fetchShell } from '@/features/workspaces'
import { isInternalPath } from '@/lib/url'

const searchSchema = z.object({
  // Only same-site paths, so the link cannot send the user elsewhere.
  redirect: z.string().refine(isInternalPath).optional().catch(undefined),
  notice: z.enum(['password-reset']).optional().catch(undefined),
})

export const Route = createFileRoute('/sign-in')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    if (await fetchShell()) {
      throw redirect({ href: search.redirect ?? '/' })
    }
  },
  component: SignInRoute,
  errorComponent: (props) => <RouteError {...props} landmark />,
})

function SignInRoute() {
  const { redirect: redirectTo, notice } = Route.useSearch()
  return <SignInPage redirectTo={redirectTo} notice={notice} />
}
