import type { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'

interface CenteredCardProps {
  /** Rendered as the page's only `<h1>`. */
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/**
 * A page outside the app shell (sign-in, sign-up, invitations): one card in
 * the middle of the screen, as the page's `<main>`.
 */
export function CenteredCard({
  title,
  description,
  children,
  footer,
}: CenteredCardProps) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="font-heading text-lg font-medium">{title}</h1>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
        {footer && (
          <CardFooter className="flex flex-col items-start gap-2 text-sm">
            {footer}
          </CardFooter>
        )}
      </Card>
    </main>
  )
}
