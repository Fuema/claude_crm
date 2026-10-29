import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorState } from '@/components/error-state'

describe('ErrorState', () => {
  it('announces the error and retries on request', async () => {
    const user = userEvent.setup()
    const handleRetry = vi.fn()
    render(
      <ErrorState
        message="Could not load employees. Try again."
        onRetry={handleRetry}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load employees. Try again.',
    )
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('has no retry button without onRetry', () => {
    render(<ErrorState />)

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
