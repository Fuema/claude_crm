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
  the Better Auth CLI from `scripts/better-auth.config.ts` and migrated like
  any other table. Regenerate them after changing Better Auth plugins, **into a
  temporary file**: the CLI overwrites the whole schema (CRM models included),
  so merge its output by hand.
- The browser uses Better Auth's client (`lib/auth-client.ts`) only for
  sign-in, sign-out, password reset, and resending the verification email.
  Sign-up (it also creates the workspace) and everything about workspaces go
  through server functions.
- **No account enumeration:** sign-up, password reset, and resending the
  verification link answer the same whether or not the email has an account
  (rules 16–17). Sign-in says only "The email or password is not correct."
- Sign-up, sign-in, password reset, and resending the verification link are
  rate-limited per IP (`docs/resiliency.md`).
- Passwords: Better Auth's hashing; 8 to 128 characters. Resetting a password
  signs out every other session.
- Forms use `method="post"`, so a submit before the page has hydrated never
  puts a password in the URL.
- Auth emails (verification, reset, invitation) are sent by Better Auth during
  the request, not through the outbox. A failed verification or reset email is
  logged and can be requested again; a failed invitation email fails the
  invitation so the inviter can retry.

## Workspace Roles

- Better Auth's organization roles: `owner` (creator), `admin`, `member`
  (`src/server/auth-roles.ts`). The CRM's `member` role adds
  `invitation: create` (rule 19); `auth-roles.test.ts` pins every role's
  permissions. Nothing else differs between roles yet (rule 1).

## Authorization and Tenant Isolation

- **The server decides.** Hiding a button is not authorization.
- `tenantMiddleware` reads the session from the request cookie, requires an
  active workspace (`session.activeOrganizationId`), checks that the user is a
  member of it, and puts the `tenantId` in the context (`getTenantDb` follows
  with the first tenant-owned table, Customers).
- The `tenantId` **never** comes from input, URL, or a header.
- Records in another workspace are `NOT_FOUND` (do not reveal they exist).
- Object storage keys, Redis keys, Durable Object names, and outbox events all
  include the `tenantId`.
- Roles: none yet (`docs/project.md`, rule 1). When added, they are checked in
  middleware or services, never only in the UI.

## Server Functions

- Every function validates input with Zod and requires a session (except the
  session check itself).
- **CSRF:** `createCsrfMiddleware` (request middleware in `src/start.ts`)
  refuses server-function requests from another site (checks
  `Sec-Fetch-Site`, then `Origin`, then `Referer`). An E2E test replays a
  real call with a foreign origin and expects 403. Better Auth's own routes
  check the origin themselves.
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
