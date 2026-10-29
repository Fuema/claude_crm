import { createFileRoute, redirect } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { CreateWorkspacePage, fetchShell } from '@/features/workspaces'

export const Route = createFileRoute('/workspaces/new')({
  beforeLoad: async ({ location }) => {
    const shell = await fetchShell()
    if (!shell) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }
    return { hasWorkspaces: shell.workspaces.length > 0 }
  },
  component: CreateWorkspaceRoute,
  errorComponent: (props) => <RouteError {...props} landmark />,
})

function CreateWorkspaceRoute() {
  const { hasWorkspaces } = Route.useRouteContext()
  return <CreateWorkspacePage hasWorkspaces={hasWorkspaces} />
}
