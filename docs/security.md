# Security

Read this before touching auth, sessions, workspaces, secrets, bindings, or
anything that renders user-supplied content.

## Secrets

- Server secrets (database URL, `BETTER_AUTH_SECRET`, Upstash token) are Worker
  secrets: `wrangler secret put` in Cloudflare, `.env` locally, GitHub
  secrets in CI. Never in code, `wrangler.jsonc` `vars`, or a `VITE_*` variable.
- Only `VITE_*` variables reach the browser, and anyone can read them.
- Never read, print, or commit `.env*` or `.dev.vars*` files. Document them in
  the `*.example` files.

## Authentication (Better Auth)

- Email and password. The session lives in an **httpOnly, Secure, SameSite=Lax
  cookie** set by Better Auth. The client never sees or stores a token.
- Better Auth is mounted at `src/routes/api/auth/$.ts` and configured in
  `src/server/auth.ts` (Prisma adapter, organization plugin, the TanStack
  Start cookie plugin).
- The auth tables (`user`, `session`, `account`, `verification`, `organization`,
  `member`, `invitation`) are part of `prisma/schema.prisma`, generated with
  the Better Auth CLI and migrated like any other table.
- The client uses Better Auth's React client only for sign-in, sign-up,
  sign-out, and switching workspace. Everything else goes through server
  functions.
- Sign-in and sign-up are rate-limited (`docs/resiliency.md`).
- Passwords: Better Auth's hashing; minimum length 8 (Better Auth default).
  <!-- TODO: confirm password policy. -->

## Authorization and Tenant Isolation

- **The server decides.** Hiding a button is not authorization.
- `tenantMiddleware` reads the session from the request cookie, requires an
  active workspace (`session.activeOrganizationId`), checks that the user is a
  member of it, and puts `{ user, tenantId, db: getTenantDb(tenantId) }` in the
  context.
- The `tenantId` **never** comes from input, URL, or a header.
- Records in another workspace are `NOT_FOUND` (do not reveal they exist).
- Object storage keys, Redis keys, Durable Object names, and outbox events all
  include the `tenantId`.
- Roles: none yet (`docs/project.md`, rule 1). When added, they are checked in
  middleware or services, never only in the UI.

## Server Functions

- Every function validates input with Zod and requires a session (except the
  session check itself).
- Mutations use `POST`. TanStack Start's server-function requests are
  same-origin; do not add permissive CORS.
- Never return Prisma rows directly; map to models so internal columns stay
  private.
- Never build raw SQL from input. Use Prisma, or `$queryRaw` with tagged
  template parameters only.

## Rendering Content

- Never use `dangerouslySetInnerHTML` without DOMPurify, and ask before
  introducing it.
- Never build URLs from user input without validating the scheme (block
  `javascript:`). Customer websites are validated as `http(s)` on save **and**
  rendered with `rel="noopener noreferrer"`.
- Redirect targets (`?redirect=`) must pass `isInternalPath`.

## Data Handling

- Never log passwords, session cookies, tokens, or personal data (customer
  and contact emails, phones). Log ids instead.
- Do not keep personal data in browser storage.
- Show generic error messages to users; keep technical details in server
  logs.
- <!-- TODO: data retention and deleting a workspace's data (GDPR). -->

## Headers

- Security headers set in the root server response: `Content-Security-Policy`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `frame-ancestors 'none'`.
  <!-- TODO (step 2): write the CSP with the shell. -->

## Dependencies

- Follow the dependency rules in `docs/conventions.md`.
- Treat `bun audit` high/critical findings as blockers; report them.

For a deeper review, use the `security-review` skill.
