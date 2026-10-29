# 0003 – Auth, workspaces, and rate limits

## Context

Step 2b built sign-up, email verification, sign-in, password reset,
workspaces, invitations, and auth rate limits on Better Auth 1.7, TanStack
Start, Upstash Redis, and Resend/Mailpit. Running the real libraries showed
several behaviors the plan did not anticipate.

## Decision

- **No account enumeration.** With required email verification, Better Auth
  answers a sign-up for an existing email with a synthetic user. We keep that:
  sign-up always says "Check your email", the account owner gets a notice email
  (`onExistingUserSignUp`), and the workspace is created only after checking
  that the returned user really exists. The `EMAIL_TAKEN` code was dropped.
- **Better Auth's browser client only for its own flows** (sign-in, sign-out,
  password reset, resend verification). Sign-up (it also creates the
  workspace) and all workspace actions are server functions.
- **Member role may invite.** Better Auth's default `member` role cannot; the
  CRM defines its own (`src/server/auth-roles.ts`). The access control is typed
  as plain `Statements`, because TypeScript 7 rejects Better Auth's narrower
  default type for its `ac` option; a test pins every role's permissions.
- **Our own rate limiter** (fixed one-minute window: `INCR` + `EXPIRE` on
  `@upstash/redis`). `@upstash/ratelimit` was removed: all its Lua scripts use
  an Upstash-only flag (`allow-key-locking`) that Redis 7.4 and 8.2 reject, so it
  could not run locally (and fail-open would have hidden that).
- **Client IP:** `CF-Connecting-IP`, except when it is loopback (only in local
  development), then `X-Forwarded-For`. E2E tests can act as different clients;
  production never trusts `X-Forwarded-For`.
- **Auth emails are sent in the request**, not through the outbox; Better Auth
  owns those flows. Verification and reset failures are logged (the user can ask
  again); invitation failures fail the request (the inviter can retry).
- **`AppError` crosses the server-function boundary** through a TanStack Start
  serialization adapter (`src/start.ts`). A global `errorMiddleware` turns any
  other error into `INTERNAL` with a generic message. Server-function input is
  validated with `validateInput(schema)`, because a raw Zod schema rejects with
  a plain Error holding the issues as JSON.
- **Forms use `method="post"`**, so a submit before hydration never puts a
  password in the URL.
- **Deferred:** dark mode (needs the theme in a cookie read during SSR to avoid
  a flash) and with it TanStack Store; `getTenantDb` (comes with the first
  tenant-owned table, Customers).

## Consequences

- One more Better Auth regeneration step when plugins change (the CLI config is
  `scripts/better-auth.config.ts`; `@better-auth/cli` is deprecated in favor of
  `npx auth generate`, to be checked at the next regeneration).
- The rate limiter is a fixed window: up to twice the limit can pass around a
  minute boundary. Acceptable for "10 per minute per IP"; revisit if abuse shows.
- The first page of the sign-in flow loads about 255 KB of gzipped JavaScript,
  slightly over the unconfirmed 250 KB budget; most of the auth chunk is Better
  Auth's client. Replacing it with a few `fetch` calls is an option if the
  budget is confirmed.
- Docker's Postgres moved to host port 55432 (5432 is often a local
  PostgreSQL service).
