import { Link, type LinkProps, useMatchRoute } from '@tanstack/react-router'
import {
  BuildingIcon,
  HomeIcon,
  type LucideIcon,
  UsersIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

interface NavItem {
  to: LinkProps['to']
  label: string
  icon: LucideIcon
}

// Each feature adds its entry here when it is built.
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/customers', label: 'Customers', icon: BuildingIcon },
  { to: '/members', label: 'Members', icon: UsersIcon },
]

export function AppSidebar() {
  const matchRoute = useMatchRoute()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="Main">
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      // Sections stay highlighted on their sub-pages (e.g. a customer).
                      isActive={Boolean(
                        matchRoute({ to: item.to, fuzzy: item.to !== '/' }),
                      )}
                      tooltip={item.label}
                    >
                      <Link
                        to={item.to}
                        // On phones the sidebar covers the page; close it
                        // once a page is chosen.
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false)
                          }
                        }}
                      >
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
