import { Link, type LinkProps, useMatchRoute } from '@tanstack/react-router'
import {
  BuildingIcon,
  HandshakeIcon,
  HomeIcon,
  ListChecksIcon,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

interface NavLink {
  to: LinkProps['to']
  label: string
}

interface NavItem extends NavLink {
  icon: LucideIcon
  /** Sub-pages, shown under the item (hidden while the sidebar is collapsed). */
  items?: NavLink[]
}

// Each feature adds its entry here when it is built.
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/customers', label: 'Customers', icon: BuildingIcon },
  {
    to: '/deals',
    label: 'Deals',
    icon: HandshakeIcon,
    items: [
      { to: '/deals', label: 'All deals' },
      { to: '/deals/board', label: 'Pipeline' },
    ],
  },
  { to: '/activities', label: 'Activities', icon: ListChecksIcon },
  { to: '/members', label: 'Members', icon: UsersIcon },
]

export function AppSidebar() {
  const matchRoute = useMatchRoute()
  const { isMobile, setOpenMobile } = useSidebar()

  // On phones the sidebar covers the page; close it once a page is chosen.
  function handleNavigate() {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

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
                      <Link to={item.to} onClick={handleNavigate}>
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.items && (
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.label}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={Boolean(matchRoute({ to: subItem.to }))}
                            >
                              <Link to={subItem.to} onClick={handleNavigate}>
                                <span>{subItem.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
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
