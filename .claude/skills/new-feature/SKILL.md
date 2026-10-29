---
name: new-feature
description: Build a new business feature as a vertical slice (schema, service, server functions, UI) following the reference feature. Use when asked to create or add a new feature, page, or domain area.
---

# New Feature

1. Read `docs/project.md`, `docs/architecture.md`, `docs/conventions.md`,
   and `docs/data-and-api.md` (and `docs/resiliency.md` if the feature needs
   idempotency, events, files, or real-time).
2. Confirm with the user: feature name, screens, entity fields, business
   rules, error codes, and domain terms. Record the answers in
   `docs/project.md` (Sections 3–7) **before** writing code. Never invent a
   rule.
3. Study the reference feature named in `docs/project.md` and copy its layout.
4. Build in this order, with tests at each step:
   1. **Schema:** models in `prisma/schema.prisma` (with `tenantId`, indexes,
      per-workspace unique constraints) → `bun run db:migrate` → update the
      seed and the test factories.
   2. **`types/`:** model types and Zod schemas (create, update, list search).
      Nothing server-only.
   3. **`server/*-service.ts`:** business rules and queries on the
      tenant-scoped db, mapping rows to models. Integration tests for every
      rule and error code, plus the cross-tenant test.
   4. **`server/*-functions.ts`:** thin server functions: middleware, Zod
      input, call the service.
   5. **`hooks/`:** query key factory (tenant-prefixed), query and mutation
      hooks.
   6. **`store.ts`:** only if the feature needs shared client UI state.
   7. **`components/`:** from shadcn/ui and the shared components; forms with
      react-hook-form + `Field`; loading, empty, error, success. If a shadcn/ui
      component is missing, ask before adding it.
   8. **`pages/`** and **`index.ts`** (export only what other code needs).
5. Add thin route files under `src/routes/_authenticated/<feature>/` (Zod
   `validateSearch` for list filters; loader prefetch for SSR).
6. Add an E2E test for the feature's critical flow.
7. Run the Definition of Done checklist in `CLAUDE.md` and report results.
