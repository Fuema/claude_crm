import { getRouteApi, Outlet } from '@tanstack/react-router'
import { Separator } from '@/components/ui/separator'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useSignOut } from '@/features/auth'
import { AppSidebar } from '@/features/shell/components/app-sidebar'
import { UserMenu } from '@/features/shell/components/user-menu'
import { useSwitchWorkspace, WorkspaceSwitcher } from '@/features/workspaces'
import { APP_NAME } from '@/lib/app-config'

const authenticatedRoute = getRouteApi('/_authenticated')

export function AuthenticatedLayout() {
  const { shell, workspace } = authenticatedRoute.useRouteContext()
  const signOut = useSignOut()
  const switchWorkspace = useSwitchWorkspace()

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="hidden font-semibold sm:inline">{APP_NAME}</span>
          <WorkspaceSwitcher
            activeWorkspace={workspace}
            workspaces={shell.workspaces}
            onSwitch={(workspaceId) => switchWorkspace.mutate(workspaceId)}
            isSwitching={switchWorkspace.isPending}
          />
          <div className="ml-auto flex items-center gap-1">
            <UserMenu
              user={shell.user}
              onSignOut={() => signOut.mutate()}
              isSigningOut={signOut.isPending}
            />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  )
}
