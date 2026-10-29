import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/features/shell'

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
})
