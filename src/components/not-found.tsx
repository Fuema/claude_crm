import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NotFoundProps {
  /**
   * Render as the page's `<main>` landmark. Use for routes outside the app
   * layout, which already provides `<main>`.
   */
  landmark?: boolean
}

export function NotFound({ landmark = false }: NotFoundProps) {
  const Container = landmark ? 'main' : 'div'

  return (
    <Container
      className={cn(
        'flex flex-col items-center justify-center gap-4 p-4 text-center',
        landmark ? 'min-h-svh' : 'min-h-[50svh]',
      )}
    >
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-md text-muted-foreground">
        The page you are looking for does not exist or has moved.
      </p>
      <Button asChild>
        <Link to="/">Go to home</Link>
      </Button>
    </Container>
  )
}
