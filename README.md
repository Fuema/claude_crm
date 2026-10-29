# CRM

A multi-tenant CRM: customers, contacts, deals, activities, and invoices.
One full-stack TypeScript app (TanStack Start) running on Cloudflare Workers,
with Neon PostgreSQL through Prisma and Better Auth.

- What the app does: [`docs/project.md`](docs/project.md)
- How to work in this repository (people and Claude): [`CLAUDE.md`](CLAUDE.md)
- Stack decision: [`docs/decisions/0001-stack-and-layout.md`](docs/decisions/0001-stack-and-layout.md)

## Status

Rules and documentation only. The application is scaffolded in step 1.

## Build Plan

| Step | What | Status |
|------|------|--------|
| 0 | Rules: `CLAUDE.md`, `docs/`, `.claude/` | In review |
| 1 | Scaffold: TanStack Start, Biome, Vitest, Playwright, Prisma, Docker, Wrangler | Planned |
| 2 | App shell, Better Auth, workspaces, tenant middleware | Planned |
| 3 | Shared components copied from the frontend template | Planned |
| 4 | Customers, the reference feature, end to end | Planned |
| 5 | Contacts, Deals, Activities, Invoices | Planned |
| 6 | CI/CD and first deployment | Planned |

## Requirements

Bun, Docker Desktop, and `jq` (for the Claude lint hook).
