# CRM

A multi-tenant CRM: customers, contacts, deals, activities, and invoices.
One full-stack TypeScript app (TanStack Start) running on Cloudflare Workers,
with Neon PostgreSQL through Prisma and Better Auth.

- What the app does: [`docs/project.md`](docs/project.md)
- How to work in this repository (people and Claude): [`CLAUDE.md`](CLAUDE.md)
- Stack decision: [`docs/decisions/0001-stack-and-layout.md`](docs/decisions/0001-stack-and-layout.md)

## Status

Sign-up with email verification, sign-in, password reset, workspaces,
invitations, Customers, Contacts, Deals (with a pipeline board), Activities,
and Invoices work end to end. Next: CI and the first deployment (step 6;
see "First Deployment" in `docs/devops.md`).

## Build Plan

| Step | What                                                                          | Status |
| ---- | ----------------------------------------------------------------------------- | ------ |
| 0    | Rules: `CLAUDE.md`, `docs/`, `.claude/`                                       | Done   |
| 1    | Scaffold: TanStack Start, Biome, Vitest, Playwright, Prisma, Docker, Wrangler | Done   |
| 2a   | Shared components copied from the frontend template (was step 3)              | Done   |
| 2b   | App shell, Better Auth, workspaces, invitations, email, rate limits           | Done   |
| 4    | Customers, the reference feature, end to end                                  | Done   |
| 5    | Contacts, Deals, Activities, Invoices                                         | Done   |
| 6    | CI/CD and first deployment                                                    | Doing  |

## Requirements

Bun, Docker Desktop, and `jq` (for the Claude lint hook).
