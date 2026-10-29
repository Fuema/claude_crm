import { Link } from '@tanstack/react-router'
import {
  BuildingIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { WorkspaceSummary } from '@/features/workspaces/types/workspace'

interface WorkspaceSwitcherProps {
  activeWorkspace: WorkspaceSummary
  workspaces: WorkspaceSummary[]
  onSwitch: (workspaceId: string) => void
  isSwitching: boolean
}

export function WorkspaceSwitcher({
  activeWorkspace,
  workspaces,
  onSwitch,
  isSwitching,
}: WorkspaceSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="max-w-64 min-w-0"
          aria-label={`Workspace: ${activeWorkspace.name}. Switch workspace`}
          disabled={isSwitching}
        >
          <BuildingIcon aria-hidden="true" />
          <span className="truncate">{activeWorkspace.name}</span>
          <ChevronsUpDownIcon aria-hidden="true" className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((workspace) => {
          const isActive = workspace.id === activeWorkspace.id
          return (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => {
                if (!isActive) {
                  onSwitch(workspace.id)
                }
              }}
              aria-current={isActive ? 'true' : undefined}
            >
              <CheckIcon
                aria-hidden="true"
                className={isActive ? undefined : 'invisible'}
              />
              <span className="truncate">{workspace.name}</span>
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/workspaces/new">
            <PlusIcon aria-hidden="true" />
            Create workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
