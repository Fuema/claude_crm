# 0005 – Request-scoped database clients

## Context

`docs/data-and-api.md` required a new Prisma client per request (Workers must
not share connections between requests) but said nothing about closing it.
With the Neon driver adapter, every client opens its own connection pool.
The Deals E2E tests failed with "Too many database connections opened";
measuring showed about 1.6 connections leaked per signed-in page load
(4 → 36 after 20 loads). In production this would exhaust Neon's connection
limit under ordinary traffic.

## Decision

- Every client a request creates is closed when the request's work is done:
  `withDb(work)` (`src/server/db.ts`) creates it and calls `$disconnect()`
  in a `finally`.
- `authMiddleware` runs the whole protected server function inside
  `withDb`, so services keep using `context.db` / `context.tenant`
  unchanged. The session check (`fetchShell`), sign-up, the Better Auth route,
  and the health route call `withDb` themselves.
- `src/server/db.test.ts` counts real connections to the test database and
  fails if `withDb` stops closing them (verified against a leaking version).

## Consequences

- One pool per server function call. An SSR page load that runs several
  server functions opens and closes several short-lived pools; fine for the
  Neon serverless driver, revisit if latency shows it.
- Any new entry point that talks to the database (a Cron Trigger, a queue
  consumer) must use `withDb` too.
- After 20 page loads the count stays at 1 connection (the test above and a
  manual check with `pg_stat_activity`).
