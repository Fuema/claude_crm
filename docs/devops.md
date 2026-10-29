# DevOps: Local Environment, CI, and Deployment

Read this before changing Docker, Wrangler, CI, environment variables, or the
deployment process.

## Runtimes

- **Bun** installs packages and runs scripts and dev tools.
- **Production runs on Cloudflare Workers (workerd)**, not Bun and not Node.
  Application code uses Web APIs and Workers APIs only. Node built-ins only
  through the `nodejs_compat` flag, and only when a library needs them.
- The dev server runs the app inside workerd through the Cloudflare Vite plugin,
  so bindings behave locally as in production.

## Local Services (Docker Compose)

`docker-compose.yml` starts (`bun run db:up`):

| Service            | Emulates                  | Why it is needed                                                                                          |
| ------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `postgres` (17.11) | Neon                      | The database (port 5432). The Prisma CLI connects here directly.                                          |
| `neon-proxy`       | Neon's WebSocket endpoint | The Neon driver speaks HTTP/WebSocket, not plain TCP; the proxy (port 5433) lets it reach local Postgres. |
| `redis`            | Upstash                   | Rate limits and idempotency keys. _Added with the first rate limit._                                      |
| `redis-rest`       | Upstash REST API          | `@upstash/redis` speaks REST, not the Redis protocol. _Added with the first rate limit._                  |

- Every service has a health check; `bun run db:up` waits until they are
  healthy.
- A separate database (`crm_test`, created by `docker/postgres/init.sql`) is
  used by integration tests.
- `getDb()` routes the Neon driver through `neon-proxy` whenever the
  connection string's host is `localhost`, so the same `DATABASE_URL` works
  for the app, the tests, and the Prisma CLI.
- Images are pinned (the proxy by digest, since it only publishes `latest`).

## Local Configuration (`.env`)

- One local file, `.env` (copied from `.env.example`, never committed, never
  read by Claude), serves everything:
  - **Wrangler / the dev server** loads it into the Worker's environment.
  - **Vitest** and the **Prisma CLI** run on Node, which does not read `.env`
    by itself; `vitest.config.ts` and `prisma.config.ts` load it with Vite's
    `loadEnv`. Real environment variables (CI) win over the file.
- `bun run` loads `.env` only into Bun's own process, not into tools it starts,
  so never rely on that.

## Wrangler

- `wrangler.jsonc` declares bindings: R2 bucket, queue producer and consumer,
  dead-letter queue, Durable Object classes, the outbox Cron Trigger, and
  `compatibility_flags`. Add a binding when its feature is built
  (`docs/resiliency.md`).
- Generate binding types after changing it (`wrangler types`).
- Local values come from `.env` (see above), not `.dev.vars`.

## Environments

| Environment | Database                     | Deployed by             |
| ----------- | ---------------------------- | ----------------------- |
| local       | Docker Postgres              | —                       |
| preview     | Neon branch per pull request | CI on pull request      |
| production  | Neon main branch             | CI on merge to `master` |

## CI (GitHub Actions)

On every pull request:

1. `bun install --frozen-lockfile`
2. `bun run check` (Biome) and `bun run typecheck`
3. `bun run test` against a Postgres service container
4. `bun run build`
5. `bun run test:e2e`
6. Deploy a preview Worker with a Neon branch.

On merge to `master`:

1. Same checks.
2. `prisma migrate deploy` against production.
3. `wrangler deploy`.

Rules:

- Migrations run **before** the new code is deployed, so migrations must be
  backwards compatible with the code still running (see "Migrations" in
  `docs/data-and-api.md`).
- Secrets come from GitHub repository secrets and `wrangler secret`, never
  from files in the repository.
- Branch protection on `master`: pull request required, checks must pass.
  <!-- TODO: set up when the GitHub repository is created. -->
