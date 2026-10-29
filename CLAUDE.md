# CLAUDE.md

Core instructions for Claude in this repository. This file holds only the rules
that apply to every task. Detailed rules live in `docs/` and are read on demand
(see **Section 4**). When two rules conflict, the more specific one wins; if it
is still unclear, ask.

---

## 1. Project Overview

A **multi-tenant CRM**: one full-stack TypeScript application (UI and server in
the same codebase) that runs on Cloudflare Workers.

- **The application** (purpose, domain terms, entities, business rules,
  features, critical flows) is described in **`docs/project.md`**. Read it at
  the start of every task.
- **Reference feature:** named in `docs/project.md`. Copy its structure for
  every new feature.
- **Server code** runs only in TanStack Start server functions and server
  routes, never in the browser bundle (see `docs/architecture.md`).

### Technical Stack

| Concern                              | Technology                                             | Rules in               |
| ------------------------------------ | ------------------------------------------------------ | ---------------------- |
| Tooling runtime                      | Bun (install, scripts). **Not** the production runtime | `docs/devops.md`       |
| Production runtime                   | Cloudflare Workers (workerd)                           | `docs/devops.md`       |
| Full-stack framework                 | TanStack Start (SSR, server functions)                 | `docs/architecture.md` |
| Routing                              | TanStack Router (file-based)                           | `docs/architecture.md` |
| Language                             | TypeScript (strict)                                    | `docs/conventions.md`  |
| UI                                   | React, Tailwind CSS v4, shadcn/ui (Radix UI)           | `docs/conventions.md`  |
| Lint and format                      | Biome                                                  | `docs/conventions.md`  |
| Database                             | Neon (serverless PostgreSQL)                           | `docs/data-and-api.md` |
| ORM                                  | Prisma 7 with the Neon driver adapter                  | `docs/data-and-api.md` |
| Auth                                 | Better Auth (organization plugin = workspace)          | `docs/security.md`     |
| Validation                           | Zod                                                    | `docs/data-and-api.md` |
| Server state                         | TanStack Query                                         | `docs/data-and-api.md` |
| Client state                         | TanStack Store                                         | `docs/data-and-api.md` |
| Tables                               | TanStack Table                                         | `docs/conventions.md`  |
| Forms                                | react-hook-form                                        | `docs/data-and-api.md` |
| Rate limit, idempotency              | Upstash Redis (REST)                                   | `docs/resiliency.md`   |
| Events                               | Transactional outbox + Cloudflare Queues               | `docs/resiliency.md`   |
| Files, real-time                     | Cloudflare R2, Durable Objects                         | `docs/resiliency.md`   |
| Unit / component / integration tests | Vitest + React Testing Library                         | `docs/quality.md`      |
| E2E tests                            | Playwright + axe-core                                  | `docs/quality.md`      |
| Local infrastructure                 | Docker Compose, Wrangler                               | `docs/devops.md`       |
| CI/CD                                | GitHub Actions                                         | `docs/devops.md`       |

Do not introduce alternatives to these (another UI kit, state library, ORM,
test runner, or CSS approach) without asking.

## 2. Commands

Run from the repository root. Use these exact commands; do not invent others.

| Purpose                | Command                               |
| ---------------------- | ------------------------------------- |
| Install                | `bun install`                         |
| Start local services   | `bun run db:up`                       |
| Stop local services    | `bun run db:down`                     |
| Dev server             | `bun run dev`                         |
| Type check             | `bun run typecheck`                   |
| Lint + format check    | `bun run check`                       |
| Lint + format fix      | `bun run check:fix`                   |
| Unit/integration tests | `bun run test`                        |
| E2E tests              | `bun run test:e2e`                    |
| Build                  | `bun run build`                       |
| New migration          | `bun run db:migrate -- --name <name>` |
| Generate Prisma client | `bun run db:generate`                 |
| Database browser       | `bun run db:studio`                   |

- **`bun run test`, never `bun test`.** `bun test` starts Bun's own test runner,
  not Vitest.
- Deploying (`wrangler deploy`, `prisma migrate deploy`) happens in CI only.

## 3. Working Style

- When requirements are ambiguous or several reasonable designs exist, **ask
  before making architectural or business decisions**. Never silently assume a
  business rule.
- For small, easily reversible choices, pick a sensible default, state it in
  your summary, and continue.
- Before a non-trivial change, give a short plan: files you will touch and why.
- Change only what the task requires. No unrelated refactors or reformatting.
- Use the domain terms in `docs/project.md` and the wording rules in
  `docs/glossary.md` in code, UI text, and tests.
- Library APIs change quickly (TanStack Start, Prisma, Better Auth). When unsure
  of an API, check the installed version's types or docs instead of guessing.

## 4. Read Before You Work

| When the task involves…                                        | Read first             |
| -------------------------------------------------------------- | ---------------------- |
| **Any task** (what the app is and its domain)                  | `docs/project.md`      |
| A new feature, new folder, moving code, server/client boundary | `docs/architecture.md` |
| Writing any component, type, or style                          | `docs/conventions.md`  |
| Database, server functions, server data, state, forms          | `docs/data-and-api.md` |
| Rate limits, idempotency, outbox, queues, R2, Durable Objects  | `docs/resiliency.md`   |
| Tests, UI checks, accessibility, or performance                | `docs/quality.md`      |
| Auth, sessions, tenants, secrets, env bindings, user HTML      | `docs/security.md`     |
| Docker, Wrangler, CI, deployment, migrations in CI             | `docs/devops.md`       |
| UI text and wording                                            | `docs/glossary.md`     |
| Delegating to an agent, or adding one                          | `docs/agents.md`       |

Specialized procedures are skills in `.claude/skills/` (code review,
accessibility review, security review, performance audit, new feature).

### Agents

Agents in `.claude/agents/` run in their own context. After implementing a
change, use them in this order:

1. `verifier` — must report PASS.
2. `code-reviewer` — must report APPROVE.
3. `docs-keeper` — when docs, terms, scripts, schema, or env bindings changed.
4. `git-committer` — **only when the user asks to commit**. Never push.

## 5. Non-Negotiable Rules

These apply to every change, even without reading the docs above.

- Never use `any`. Never disable `strict`.
- **Tenant isolation:** every read and write of tenant-owned data is scoped by
  the `tenantId` taken from the server-side session, never from client input.
  Every feature has a test proving one workspace cannot see another's data.
- **Server code stays on the server:** Prisma, secrets, and bindings are used
  only in server functions, server routes, and `src/server/`. Client code never
  imports them.
- Every server function validates its input with Zod and checks the session.
- Production runs on workerd: never use Bun-only APIs (`Bun.*`, `bun:*`) in
  application code.
- `components/` never imports from `features/`. Features never import another
  feature's internals; only its `index.ts`.
- Never put secrets in client code or in `wrangler.jsonc` `vars`. Only `VITE_*`
  variables reach the browser, and anyone can read them.
- Never swallow errors (no empty `catch`).
- Never delete or skip a test to make the suite pass.
- **Ask before adding any dependency.**

## 6. Protected Files

Do not edit these without asking first:

- `.env`, `.env.*`, `.dev.vars*` (never read or print their values)
- `bun.lock` (change it only through `bun install` / `bun add`)
- `vite.config.*`, `tsconfig*.json`, `biome.json`, `wrangler.jsonc`, `prisma.config.ts`
- **Existing migrations** in `prisma/migrations/` (never edit an applied
  migration; create a new one)
- `components.json` (shadcn/ui config) and the theme variables in `src/styles.css`
- CI/CD files (`.github/`), `docker-compose.yml`
- Generated code: `src/routeTree.gen.ts`, `src/generated/` (Prisma client)
- `.claude/settings.json`

## 7. Git & Change Rules

- Do not commit or push unless asked.
- **Never commit to `master`.** Work happens on a branch named
  `<type>/<short-description>` (e.g. `feat/customer-filters`). If you are on
  `master` when a change starts, propose a branch name and create it once the
  user agrees.
- When asked to commit, delegate to the `git-committer` agent.
- Keep each change small and focused on one task.
- Commit messages: Conventional Commits, imperative mood
  (e.g. `feat(customers): add archive action`).
- Before finishing, review the full diff for unintended changes.

## 8. Definition of Done

A task is complete only when all of these are true:

- [ ] The requested behavior is implemented.
- [ ] Existing functionality still works.
- [ ] Type check passes.
- [ ] `bun run check` (Biome) passes.
- [ ] Relevant tests pass (new behavior has tests; server functions have
  integration tests, including a cross-tenant test).
- [ ] Schema changes have a migration, and the migration was applied locally.
- [ ] UI changes were visually verified (mobile + desktop) and meet the
  accessibility baseline in `docs/quality.md`.
- [ ] No unnecessary dependencies were added.
- [ ] No temporary or debug code remains (`console.log`, commented-out code).
- [ ] Documentation is updated when behavior or conventions changed.
- [ ] The final diff was reviewed for unintended changes.

When you finish, report which checks you ran and their results (the
`verifier` agent's report covers the automated ones).
