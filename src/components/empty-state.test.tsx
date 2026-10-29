import { render, screen } from '@testing-library/react'
import { UsersIcon } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

describe('EmptyState', () => {
  it('says what is missing and offers the next action', () => {
    render(
      <EmptyState
        icon={UsersIcon}
        title="No employees yet"
        description="Add your first employee to get started."
        action={<Button>Add employee</Button>}
      />,
    )

    expect(screen.getByText('No employees yet')).toBeInTheDocument()
    expect(
      screen.getByText('Add your first employee to get started.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add employee' }),
    ).toBeInTheDocument()
  })
})
