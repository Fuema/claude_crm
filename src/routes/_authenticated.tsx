import { createFileRoute, redirect } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { AuthenticatedLayout } from '@/features/shell'
import { fetchShell, switchWorkspace } from '@/features/workspaces'

export const Route = createFileRoute('/_authenticated')({
  // For the UI only; every server function checks the session again.
  beforeLoad: async ({ location }) => {
    const shell = await fetchShell()
    if (!shell) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }
    let workspace = shell.activeWorkspace
    if (!workspace) {
      const first = shell.workspaces[0]
      if (!first) {
        throw redirect({ to: '/workspaces/new' })
      }
      await switchWorkspace({ data: { workspaceId: first.id } })
      workspace = first
    }
    return { shell, workspace }
  },
  component: AuthenticatedLayout,
  // Shown before the layout (and its <main>) exists.
  errorComponent: (props) => <RouteError {...props} landmark />,
})
