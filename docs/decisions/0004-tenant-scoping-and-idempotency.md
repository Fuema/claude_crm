# 0004 – Tenant scoping and idempotency

## Context

Customers is the first tenant-owned table and the first change that must not
run twice. Both mechanisms were planned in `docs/data-and-api.md` and
`docs/resiliency.md`; building them showed details the plan left open.

## Decision

- **Tenant scoping is a Prisma client extension** (`getTenantDb`) applied to
  the models in `TENANT_MODELS`: `tenantId` is added to every `where` and to
  every create's `data`, overwriting a caller's value. It throws for
  operations it does not know how to scope, so a new Prisma operation cannot
  silently bypass it.
- **Services take a `TenantScope` (`{ db, tenantId }`)**, not just the client:
  the extension does not change Prisma's types, which still require `tenantId`
  on create.
- **Changes use `updateMany` with the id (and conditions) in `where`.** Another
  workspace's row matches nothing, and rules such as "an archived customer is
  read-only" are checked in the same statement.
- **Idempotency is a helper, not a middleware** (`getIdempotencyStore().run`):
  the key travels in the validated input (`idempotencyKey`), and the helper
  wraps just the service call. Keys are scoped per workspace. It fails open
  when Redis is unreachable; unique constraints still protect the data.
- **`db:migrate` runs a script** (`scripts/db-migrate.ts`) instead of
  `prisma migrate dev && prisma generate`: package-script arguments were
  appended to `prisma generate`, so `--name` never reached `migrate dev`,
  which then waited at an invisible prompt and held Prisma's advisory lock.

## Consequences

- Every new tenant-owned model must be added to `TENANT_MODELS`; its service
  tests include a cross-workspace test (they would fail otherwise).
- Nested relation writes into tenant models are not scoped; services avoid
  them.
- PostgreSQL row-level security remains a possible second barrier (TODO in
  `docs/data-and-api.md`).
