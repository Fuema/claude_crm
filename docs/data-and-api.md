# Data, Server Functions, State, and Forms

Read this before touching the database, server functions, server data,
client state, or forms.

## Where State Lives

Pick the first option that fits:

| Kind of state                                | Where it lives                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| Business data                                | **PostgreSQL** (Prisma), read through server functions                       |
| Server data in the UI                        | **TanStack Query**                                                           |
| State shareable by URL (filters, page, sort) | **TanStack Router** search params (Zod-validated)                            |
| Form values                                  | **react-hook-form** + **Zod**                                                |
| UI state for one component                   | `useState` / `useReducer`                                                    |
| Client state shared across screens           | **TanStack Store** (sidebar, theme, table density)                           |
| The session                                  | Better Auth cookie, read on the server; the client gets it from `getSession` |

## Database (Prisma 7 + Neon)

- Schema in `prisma/schema.prisma`; config in `prisma.config.ts`. The client is
  generated into `src/generated/prisma` (`bun run db:generate`).
- On Workers, the client uses the **Neon driver adapter**
  (`@prisma/adapter-neon`). Do not use `@prisma/client/edge`, Prisma
  Accelerate, or `--no-engine`.
- The generator uses `runtime = "cloudflare"`: Workers cannot compile
  WebAssembly at runtime, so the query compiler is imported as a `.wasm`
  module. Vitest (Node) loads that import through a small plugin in
  `vitest.config.ts`; keep both when upgrading Prisma.
- Import the client from `@/generated/prisma/client`.
- **Create the client per request, and close it**: a Worker must not reuse a
  database connection across requests, and every client opens its own
  connection pool. Use `withDb(async (db) => …)` (`src/server/db.ts`), which
  closes the client in a `finally`. `authMiddleware` already wraps every
  protected server function this way (`context.db`); only code outside it
  (the session check, sign-up, the Better Auth route, health) calls `withDb`
  itself. A client that is never closed leaks connections until Postgres
  refuses new ones (ADR 0005); `src/server/db.test.ts` guards this.
- Models: PascalCase singular (`Customer`); fields camelCase; tables mapped to
  snake_case plural with `@@map("customers")`.
- IDs: `String @id @default(uuid(7))`.
- Every tenant-owned model has `tenantId String`, a relation to `Tenant`, and
  an index that starts with `tenantId` (e.g. `@@index([tenantId, name])`).
  Uniqueness rules are per workspace: `@@unique([tenantId, …])`.
- Money: `Decimal @db.Decimal(12, 2)` + a `currency` field. Never `Float`.
  Convert to a string (or a number of minor units) when sending to the client.
- Dates without a time (`expectedCloseDate`): `DateTime @db.Date`, sent to the
  client as `'YYYY-MM-DD'`.
- Case-insensitive uniqueness (customer name): store a normalized column
  (`nameNormalized`, lower-cased and trimmed) with `@@unique([tenantId,
  nameNormalized])`.

### Tenant scoping

- Services receive a `TenantScope` (`{ db, tenantId }`) as their first
  argument; `tenantMiddleware` puts it in the context as `context.tenant`.
  `db` comes from `getTenantDb(tenantId)` (`src/server/tenant-db.ts`): a
  Prisma client extension that adds `tenantId` to the `where` of every
  read/update/delete and to the `data` of every create on the models listed in
  `TENANT_MODELS`. **Add every new tenant-owned model to that list.**
- Prisma's types still require `tenantId` on create: pass `scope.tenantId`
  (the extension would overwrite a wrong value anyway).
- Not covered by the extension: nested writes into a tenant model through a
  relation. Create tenant rows with their own top-level call.
- Prefer `updateMany`/`deleteMany` with the id in `where` for changes: a row of
  another workspace then simply matches nothing (`count` 0 → `NOT_FOUND`).
  Conditions in the same `where` (e.g. `status: 'active'`) make checks atomic.
- Integration tests create a workspace with `createTestWorkspace(db)`
  (`src/tests/factories/workspace.ts`).
- Never call `getDb()` from a feature service. The unscoped client is for
  Better Auth, the outbox relay, migrations, and seeds only.
- A record from another workspace is `NOT_FOUND`.
- Every feature's service tests include a cross-tenant test: create data in
  workspace A, act as workspace B, expect `NOT_FOUND` / an empty list.
- <!-- TODO (later): add PostgreSQL row-level security as a second barrier. -->

### Migrations

- Change the schema → `bun run db:migrate` (creates and applies a migration
  locally) → commit the migration with the code that needs it.
- Never edit an applied migration. Never use `prisma db push` outside
  throw-away experiments.
- Destructive changes (drop or rename a column) are done in steps: add the new
  column, backfill, switch the code, then drop in a later migration.
- Production migrations run in CI (`prisma migrate deploy`) before the Worker
  is deployed (see `docs/devops.md`).

## Server Functions

Server functions are the app's API. The client imports and calls them like
async functions; TanStack Start turns each call into an HTTP request.

```ts
// features/workspaces/server/workspace-functions.ts (the pattern)
export const inviteMemberFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware]) // session + active workspace → context
  .validator(validateInput(inviteMemberSchema)) // Zod schema from types/
  .handler(({ data, context }) =>
    inviteMember(context.auth, context.headers, context.tenantId, data.email),
  )
```

- Always wrap the schema in `validateInput(schema)` (`src/server/validate.ts`).
  A raw Zod schema in `.validator()` rejects with a plain Error holding the
  issues as JSON; `validateInput` rejects with `VALIDATION_FAILED` and field
  errors.
- Middleware context: `authMiddleware` gives `{ auth, db, headers, user,
  activeWorkspaceId }`; `tenantMiddleware` adds `tenantId` after checking the
  user is still a member of the active workspace.
- Call server functions from components through `useServerFn(fn)` inside a
  feature hook; loaders and `beforeLoad` may call them directly.

- `GET` for reads, `POST` for every change.
- **Every function** uses `tenantMiddleware` (or `authMiddleware` for the
  few that need a session but no workspace). There are no public server
  functions except the session check.
- **Every function** validates its input with a Zod schema from the feature's
  `types/`. Never trust the client's TypeScript types.
- Changes that must not run twice (creating records, sending, charging) also
  use `idempotencyMiddleware` (see `docs/resiliency.md`).
- Return **models**, not Prisma rows: map in the service (`toCustomer(row)`) so
  internal columns (`tenantId`, `nameNormalized`) never reach the client.
- Lists return `{ items, total, page, pageSize }`. Paging, sorting, and search
  happen in the database.
- Middleware and validator API names (`createMiddleware`, `.validator`) follow
  the installed TanStack Start version; check its types if unsure.

## Errors

- Business failures throw `AppError` (`src/lib/app-error.ts`, shared by server
  and client):

```ts
class AppError extends Error {
  code: ErrorCode // see docs/project.md, Error codes
  message: string // safe to show to the user
  details?: Record<string, string[]> // field errors
}
```

- `src/start.ts` registers a serialization adapter, so an `AppError` thrown in
  a server function arrives in the browser as an `AppError` with its `code`
  and `details`.
- Zod failures are turned into `VALIDATION_FAILED` with `details` by
  `validateInput`.
- Prisma errors are mapped in the service: unique violation (`P2002`) → the
  matching business code (`NAME_TAKEN`); record not found → `NOT_FOUND`.
  Better Auth errors are mapped by their code (`betterAuthErrorCode`).
- `errorMiddleware` (global, in `src/start.ts`) logs every other error on the
  server and replaces it with `INTERNAL` and a generic message. Never send
  stack traces or SQL to the client.
- On the client, `errorMessage(error)` (`lib/error-message.ts`) gives the text
  to show, including our wording for Better Auth client errors; forms use
  `showSubmitError` (`lib/form-errors.ts`) to put `details` on their fields.
- Never swallow errors. Preserve the original with `cause`.

## Queries and Mutations (client)

- Wrap every server function call in a feature hook (`useCustomers`,
  `useUpdateCustomer`). Components call the hook.
- Query keys come from one factory per feature, and **start with the active
  workspace id** so switching workspaces never shows cached data from the
  previous one:

```ts
export const customerKeys = {
  all: (tenantId: string) => ['tenant', tenantId, 'customers'] as const,
  lists: (tenantId: string) => [...customerKeys.all(tenantId), 'list'] as const,
  list: (tenantId: string, params: CustomerListParams) =>
    [...customerKeys.lists(tenantId), params] as const,
  detail: (tenantId: string, id: string) =>
    [...customerKeys.all(tenantId), 'detail', id] as const,
}
```

- Switching workspace clears the query cache (`queryClient.clear()`).
- Build keys on `workspaceKey(tenantId)` (`lib/query-keys.ts`). A feature
  whose data other features show (a customer's name on its deals, a contact
  on a deal) invalidates the whole `workspaceKey` after a change, instead of
  importing the other features' keys. Only queries on screen refetch.
- Pickers come from the owning feature's `index.ts` (`useCustomerOptions`
  from Customers, `useContactOptions` from Contacts), typed as
  `LookupOption` (`src/types/lookup-option.ts`).
- After a mutation, invalidate the affected keys. Optimistic updates only when
  asked (the pipeline board is a likely candidate).
- Mutation feedback (from the earlier CRM, unchanged):
  - **From a form** (create, edit): success toast; failure inline in the form
    (field errors with `setError`, others as `root.server`). The dialog stays
    open.
  - **Without a form** (delete, archive): toast success and failure.
  - `NOT_FOUND` on delete: "<name> was already deleted.", close, refresh.
- Every screen that loads data handles four states: loading (`Skeleton`),
  empty (`EmptyState`), error (`ErrorState` with retry), success.

## Client State (TanStack Store)

- **Never put server data in a store.** It belongs to TanStack Query.
- One store per concern, in `src/stores/` (global) or `features/<name>/store.ts`.
- Read with selectors (`useStore(store, (s) => s.sidebarOpen)`) so components
  re-render only when their slice changes.
- Change state through exported action functions next to the store
  (`setSidebarOpen(open)`), not `store.setState` in components.
- Persist only harmless preferences (theme, sidebar) and only on the client.
  Never persist personal data. The session is never in a store.

## Forms (react-hook-form + Zod + shadcn/ui Field)

- One Zod schema per form in the feature's `types/`. The **same schema**
  validates on the client (`zodResolver`) and in the server function
  (`validateInput` in the `.validator()`).
- Build forms with shadcn/ui `Field`, `FieldLabel`, `FieldError`, driven by
  react-hook-form's `Controller` (as in the frontend template).
- Same form component for create and edit; `defaultValues` for edit.
- Show `AppError.details` on fields with `form.setError`.
- Disable submit while pending; send an idempotency key for creates.

## Environment and Bindings

- **Server values** (database URL, Better Auth secret, Upstash token) are
  Worker secrets or bindings, read only through `src/server/env.ts`
  (validated with Zod) from `process.env` (filled by `nodejs_compat` on
  Workers). Locally they come from `.env` (see `docs/devops.md`).
- **Client values** are `VITE_*` variables, read only through `src/lib/env.ts`.
  They are public: never a secret.
- Document every variable in `.env.example` (no real values).
