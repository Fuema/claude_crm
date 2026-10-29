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
- **Create the client per request** with `getDb()` (`src/server/db.ts`): a
  Worker must not reuse a database connection across requests.
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

- Services receive a **tenant-scoped client** from `getTenantDb(tenantId)`
  (`src/server/tenant-db.ts`). It is a Prisma client extension that adds
  `tenantId` to the `where` of every read/update/delete and to the `data` of
  every create on tenant-owned models.
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
// features/customers/server/customer-functions.ts
export const updateCustomer = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware]) // session + active workspace → context
  .inputValidator(updateCustomerSchema) // Zod schema from types/
  .handler(({ data, context }) => customerService.update(context.db, data))
```

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
- Middleware API names (`createMiddleware`, `inputValidator`) follow the
  installed TanStack Start version; check its types if unsure.

## Errors

- Business failures throw `AppError` (`src/server/errors.ts`):

```ts
class AppError extends Error {
  code: ErrorCode // see docs/project.md, Error codes
  message: string // safe to show to the user
  details?: Record<string, string[]> // field errors
}
```

- Zod failures in `inputValidator` are turned into `VALIDATION_FAILED` with
  `details` by a shared middleware.
- Prisma errors are mapped in the service: unique violation (`P2002`) → the
  matching business code (`NAME_TAKEN`); record not found → `NOT_FOUND`.
- Unknown errors are logged on the server with context and reach the client as
  a generic message. Never send stack traces or SQL to the client.
- On the client, `isAppError(error)` narrows the error for forms and toasts.
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
  (`inputValidator`).
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
