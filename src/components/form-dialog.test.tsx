import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FormEvent } from 'react'
import { FormDialog } from '@/components/form-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const FORM_ID = 'add-employee-form'

function renderDialog(props: { isPending?: boolean } = {}) {
  const handleSubmit = vi.fn((event: FormEvent) => event.preventDefault())
  const handleOpenChange = vi.fn()
  render(
    <FormDialog
      open
      onOpenChange={handleOpenChange}
      title="Add employee"
      description="Enter the employee's details."
      formId={FORM_ID}
      submitLabel="Add employee"
      isPending={props.isPending}
    >
      <form id={FORM_ID} onSubmit={handleSubmit}>
        <Label htmlFor="first-name">First name</Label>
        <Input id="first-name" />
      </form>
    </FormDialog>,
  )
  return { handleSubmit, handleOpenChange, user: userEvent.setup() }
}

describe('FormDialog', () => {
  it('submits the form from the footer button', async () => {
    const { handleSubmit, user } = renderDialog()

    expect(
      screen.getByRole('dialog', { name: 'Add employee' }),
    ).toHaveAccessibleDescription("Enter the employee's details.")
    await user.type(screen.getByLabelText('First name'), 'Jane')
    await user.click(screen.getByRole('button', { name: 'Add employee' }))

    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  it('has no description reference when no description is given', () => {
    render(
      <FormDialog
        open
        onOpenChange={vi.fn()}
        title="Rename"
        formId="rename-form"
        submitLabel="Save changes"
      >
        <form id="rename-form" />
      </FormDialog>,
    )

    expect(screen.getByRole('dialog', { name: 'Rename' })).not.toHaveAttribute(
      'aria-describedby',
    )
  })

  it('closes on cancel', async () => {
    const { handleOpenChange, user } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(handleOpenChange).toHaveBeenCalledWith(false)
  })

  it('cannot submit or close while pending', async () => {
    const { handleOpenChange, user } = renderDialog({ isPending: true })

    expect(screen.getByRole('button', { name: 'Add employee' })).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Close' }),
    ).not.toBeInTheDocument()
    await user.keyboard('{Escape}')

    expect(handleOpenChange).not.toHaveBeenCalled()
  })
})
