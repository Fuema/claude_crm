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

| Service        | Emulates            | Why it is needed |
|----------------|---------------------|------------------|
| `postgres` (17)| Neon                | The database. |
| `neon-proxy`   | Neon's WebSocket endpoint | The Neon driver speaks HTTP/WebSocket, not plain TCP; the proxy lets it reach local Postgres. |
| `redis`        | Upstash             | Rate limits and idempotency keys. |
| `redis-rest`   | Upstash REST API    | `@upstash/redis` speaks REST, not the Redis protocol. |

- Every service has a health check; the dev script waits until they are
  healthy.
- A separate database (`crm_test`) is used by integration tests.
- <!-- TODO (step 1): pick and pin the proxy images, and confirm the Neon
  driver settings for the local proxy. Alternative: a Neon dev branch instead
  of local Postgres. -->

## Wrangler

- `wrangler.jsonc` declares bindings: R2 bucket, queue producer and consumer,
  dead-letter queue, Durable Object classes, the outbox Cron Trigger, and
  `compatibility_flags`. Add a binding when its feature is built
  (`docs/resiliency.md`).
- Generate binding types after changing it (`wrangler types`).
- Local secrets live in `.dev.vars` (never committed, never read by Claude);
  `.dev.vars.example` documents them.

## Environments

| Environment | Database                | Deployed by |
|-------------|-------------------------|-------------|
| local       | Docker Postgres         | —           |
| preview     | Neon branch per pull request | CI on pull request |
| production  | Neon main branch        | CI on merge to `master` |

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
