import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '@/components/confirm-dialog'

function renderDialog(props: { isPending?: boolean } = {}) {
  const handleConfirm = vi.fn()
  const handleOpenChange = vi.fn()
  render(
    <ConfirmDialog
      open
      onOpenChange={handleOpenChange}
      title="Delete employee?"
      description="This will permanently delete Jane Doe."
      confirmLabel="Delete employee"
      onConfirm={handleConfirm}
      variant="destructive"
      isPending={props.isPending}
    />,
  )
  return { handleConfirm, handleOpenChange, user: userEvent.setup() }
}

describe('ConfirmDialog', () => {
  it('names the record and confirms', async () => {
    const { handleConfirm, handleOpenChange, user } = renderDialog()

    const dialog = screen.getByRole('alertdialog', { name: 'Delete employee?' })
    expect(dialog).toHaveAccessibleDescription(
      'This will permanently delete Jane Doe.',
    )
    await user.click(screen.getByRole('button', { name: 'Delete employee' }))

    expect(handleConfirm).toHaveBeenCalledTimes(1)
    // The caller closes the dialog once the action succeeds.
    expect(handleOpenChange).not.toHaveBeenCalled()
  })

  it('closes on cancel and on Escape', async () => {
    const { handleOpenChange, user } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.keyboard('{Escape}')

    expect(handleOpenChange).toHaveBeenCalledWith(false)
    expect(handleOpenChange).toHaveBeenCalledTimes(2)
  })

  it('cannot be confirmed or dismissed while pending', async () => {
    const { handleOpenChange, user } = renderDialog({ isPending: true })

    expect(
      screen.getByRole('button', { name: 'Delete employee' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.keyboard('{Escape}')

    expect(handleOpenChange).not.toHaveBeenCalled()
  })
})
