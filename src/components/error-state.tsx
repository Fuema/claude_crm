import { TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

interface ErrorStateProps {
  title?: string
  /** Safe to show to the user, e.g. `ApiError.message`. */
  message?: string
  /** Shows a "Try again" button when provided. */
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'The data could not be loaded.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Empty className={className}>
      <EmptyHeader role="alert">
        <EmptyMedia variant="icon" className="text-destructive">
          <TriangleAlertIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}
