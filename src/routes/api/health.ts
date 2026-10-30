import { createFileRoute } from '@tanstack/react-router'
import { withDb } from '@/server/db'
import { checkDatabase } from '@/server/health'

/** For uptime monitoring: 200 when the database answers, 503 otherwise. */
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        const database = await withDb(checkDatabase)
        return Response.json(
          { database },
          { status: database === 'connected' ? 200 : 503 },
        )
      },
    },
  },
})
