import { createFileRoute } from '@tanstack/react-router'
import { getHealth } from '@/server/health'

// Step 1 placeholder: proves SSR → server function → Prisma → Postgres.
// Replaced by the app shell in step 2.
export const Route = createFileRoute('/')({
  loader: () => getHealth(),
  component: HomePage,
})

function HomePage() {
  const health = Route.useLoaderData()
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold">CRM</h1>
      <p className="mt-4">
        Database: <span>{health.database}</span>
      </p>
    </main>
  )
}
