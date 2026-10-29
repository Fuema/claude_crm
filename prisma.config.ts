import { defineConfig } from 'prisma/config'
import { loadEnv } from 'vite'

// The Prisma CLI runs on Node, which does not read `.env` by itself. Vite's
// loadEnv reads `.env` and lets real environment variables (CI) win.
const env = loadEnv('development', process.cwd(), '')

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: { path: './prisma/migrations' },
  datasource: { url: env.DATABASE_URL ?? '' },
})
