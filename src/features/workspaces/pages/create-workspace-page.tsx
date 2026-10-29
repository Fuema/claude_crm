import { Link } from '@tanstack/react-router'
import { CenteredCard } from '@/components/centered-card'
import { CreateWorkspaceForm } from '@/features/workspaces/components/workspace-forms'
import { useCreateWorkspace } from '@/features/workspaces/hooks/use-workspaces'
import type { CreateWorkspaceValues } from '@/features/workspaces/types/workspace'

interface CreateWorkspacePageProps {
  /** False for a user without any workspace (rule 20): nothing to go back to. */
  hasWorkspaces: boolean
}

export function CreateWorkspacePage({
  hasWorkspaces,
}: CreateWorkspacePageProps) {
  const createWorkspace = useCreateWorkspace()

  async function handleSubmit(values: CreateWorkspaceValues) {
    await createWorkspace.mutateAsync(values)
  }

  return (
    <CenteredCard
      title="Create a workspace"
      description={
        hasWorkspaces
          ? 'A separate space with its own customers and members. You will be its owner.'
          : 'You are not a member of any workspace yet. Create one, or ask a colleague to invite you.'
      }
      footer={
        hasWorkspaces && (
          <Link to="/" className="underline underline-offset-4">
            Back to the app
          </Link>
        )
      }
    >
      <CreateWorkspaceForm onSubmit={handleSubmit} />
    </CenteredCard>
  )
}
