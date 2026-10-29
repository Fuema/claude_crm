# 0001 – Stack, runtime, and project layout

## Context

The CRM is rebuilt from scratch as one full-stack application. The stack was
chosen in the `.claudeServer` notes (Bun, TanStack Start, Biome, Neon, Prisma,
Cloudflare, Upstash, TanStack Query/Store/Table). Reviewing those notes showed
some usage details that would not work or are outdated. The UI rules and shared
components come from the earlier frontend template (`claude_frontend_solution`).

## Decision

- **Keep the whole stack**, with these usage corrections:
  - Bun is the tooling runtime only. Production runs on Cloudflare Workers
    (workerd); no Bun-only APIs in application code.
  - Deploy as a **Cloudflare Worker** (not Cloudflare Pages static output),
    because TanStack Start renders on the server.
  - Prisma 7 uses the **Neon driver adapter** (`@prisma/adapter-neon`), not
    `@prisma/client/edge` or `--no-engine`. Pin Prisma to `7.10.x`: npm's
    `latest` tag for `prisma` pointed to an 8.0 release candidate on
    2026-10-29.
  - The outbox needs a **relay** (Cron Trigger) and **idempotent consumers**;
    Cloudflare Queues deliver at least once and do not guarantee order.
  - Local Docker needs proxies: Neon's WebSocket proxy for Postgres and a REST
    proxy for Redis, because the serverless drivers do not speak the native
    protocols.
  - R2, Queues, Durable Objects, and Upstash are added when a feature first
    needs them (`docs/resiliency.md`).
- **Choices made for gaps in the notes:** Vitest + React Testing Library +
  Playwright (tests), Better Auth with the organization plugin (auth and
  workspaces), multi-tenant from day one with a `tenantId` on every business
  table.
- **Layout:** feature folders (vertical slices, `src/features/<name>/` with a
  `server/` subfolder) instead of the notes' split into `server/actions/` and
  `client/modules/`, so each feature's schema use, rules, and UI live
  together, matching the frontend template.
- **Domain names:** Customer, Contact, Deal, Activity, Invoice (not the notes'
  Account and Interaction). The domain rules settled in `claude_crm_solution`
  carry over, scoped per workspace.

## Consequences

- One deployable Worker; no separate API project or CORS.
- The template's HTTP client, MSW mocks, and in-memory token auth are not
  reused; server functions and cookie sessions replace them.
- Library APIs (TanStack Start, Prisma 7, Better Auth) move fast; step 1
  confirms exact APIs against the installed versions and updates the docs.
- Revisit the Prisma pin when Prisma 8 is released as stable.
