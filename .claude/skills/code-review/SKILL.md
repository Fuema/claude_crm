---
name: code-review
description: Review a diff, branch, or set of files against this project's rules. Use when asked to review code, check a change, or before proposing a commit.
---

# Code Review

1. Get the change: `git diff` (or the files/branch the user names).
2. Check it against each area below. Read the matching doc when needed.

| Area          | Check                                                        | Source                  |
|---------------|--------------------------------------------------------------|-------------------------|
| Scope         | Only what the task needed; no unrelated changes              | `CLAUDE.md` §3          |
| Tenancy       | Services use `getTenantDb`; `tenantId` only from the session; other workspaces' records are `NOT_FOUND`; cross-tenant test exists | `docs/data-and-api.md`, `docs/security.md` |
| Server boundary | Prisma, secrets, bindings only in server functions / `src/server/` / `*-service.ts`; `types/` imports nothing server-only; loaders call server functions | `docs/architecture.md` |
| Server functions | Zod `inputValidator`, tenant middleware, `POST` for changes, models returned (not Prisma rows), idempotency where required | `docs/data-and-api.md` |
| Database      | Migration added and not edited after apply; `tenantId` indexes; per-workspace unique constraints; `Decimal` for money; no N+1 | `docs/data-and-api.md` |
| Resiliency    | Outside effects go through the outbox; consumers idempotent; rate limits on auth | `docs/resiliency.md` |
| Runtime       | No Bun-only APIs; no `window`/`document` during render (SSR) | `CLAUDE.md` §5, `docs/architecture.md` |
| Structure     | Correct folder; import direction; only `index.ts` across features | `docs/architecture.md` |
| Conventions   | Naming, component size, named exports, no `any`, avoid `as`  | `docs/conventions.md`   |
| Styling       | Tailwind theme tokens only, `cn()` for conditionals, no inline styles | `docs/conventions.md` |
| UI components | shadcn/ui and shared components reused; `components/ui/` not changed for one screen; lucide icons | `docs/conventions.md` |
| Client data   | TanStack Query with tenant-prefixed keys; four states handled; no server data in stores | `docs/data-and-api.md` |
| Forms         | Same Zod schema client and server; `AppError.details` mapped to fields | `docs/data-and-api.md` |
| Errors        | `AppError` codes from `docs/project.md`; no empty catch; cause preserved; no internals sent to the client | `docs/data-and-api.md` |
| Tests         | New behavior tested; services have integration tests; queries by role/label | `docs/quality.md` |
| Accessibility | Labels, keyboard, semantic HTML                              | `docs/quality.md`       |
| Security      | No secrets, no unsanitized HTML, safe URLs and redirects, no personal data in logs | `docs/security.md` |
| Hygiene       | No `console.log`, no commented-out code, no new deps unasked | `CLAUDE.md` §5          |

3. Report findings grouped as **Must fix**, **Should fix**, **Nice to have**.
   For each: file, line, the rule broken, and a suggested fix.
4. Do not change code during a review unless the user asks.
