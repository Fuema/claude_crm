import { type ErrorComponentProps, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'

interface RouteErrorProps extends ErrorComponentProps {
  /**
   * Render as the page's `<main>` landmark. Use for routes outside the app
   * layout, which already provides `<main>`.
   */
  landmark?: boolean
}

export function RouteError({
  error,
  reset,
  landmark = false,
}: RouteErrorProps) {
  const router = useRouter()

  useEffect(() => {
    logger.error('Route failed to render', {
      error,
      path: router.state.location.pathname,
    })
  }, [error, router])

  function handleRetry() {
    reset()
    void router.invalidate()
  }

  const Container = landmark ? 'main' : 'div'

  return (
    <Container
      className={cn(
        'flex flex-col items-center justify-center gap-4 p-4 text-center',
        landmark ? 'min-h-svh' : 'min-h-[50svh]',
      )}
    >
      <div role="alert" className="flex flex-col items-center gap-4">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-muted-foreground">
          This page could not be loaded. Try again, or reload the page if the
          problem continues.
        </p>
      </div>
      <Button onClick={handleRetry}>Try again</Button>
    </Container>
  )
}
