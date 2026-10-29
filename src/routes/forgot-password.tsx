import { createFileRoute } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { ForgotPasswordPage } from '@/features/auth'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
  errorComponent: (props) => <RouteError {...props} landmark />,
})
