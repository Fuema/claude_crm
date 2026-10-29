import { render, screen } from '@testing-library/react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'

describe('PageHeader', () => {
  it('shows the title as the page heading, with description and actions', () => {
    render(
      <PageHeader
        title="Employees"
        description="Everyone in your workspace."
        actions={<Button>Add employee</Button>}
      />,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Employees' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Everyone in your workspace.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add employee' }),
    ).toBeInTheDocument()
  })

  it('renders only the title when nothing else is given', () => {
    render(<PageHeader title="Employees" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Employees',
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
