# 0002 – Local configuration, TypeScript 7, and Prisma on Workers

## Context

Step 1 (scaffold) ran the stack end to end for the first time and found
details that ADR 0001 could not settle on paper.

## Decision

- **TypeScript 7** (native compiler). The frontend template pinned 6.0 only for
  typescript-eslint; Biome does not depend on TypeScript.
- **One `.env` file** for local values, instead of `.env` plus `.dev.vars`.
  Wrangler reads it for the local Worker. Vitest and the Prisma CLI run on
  Node, which does not read `.env`, so their configs load it with Vite's
  `loadEnv` (no `dotenv` dependency). `bun run` does not pass `.env` to the
  tools it starts.
- **Prisma generator `runtime = "cloudflare"`.** With the default runtime the
  query compiler is embedded as base64 and compiled at runtime, which workerd
  forbids ("Wasm code generation disallowed by embedder"). The Cloudflare
  runtime imports it as a `.wasm` module and also shrinks the Worker bundle
  (about 1.3 MB gzipped in total).
- **Tests load that `.wasm?module` import with a ~10-line Vite plugin** in
  `vitest.config.ts`, instead of running integration tests in workerd
  (`@cloudflare/vitest-pool-workers`, a new dependency) or generating a second
  client for Node.
- **Local Neon emulation:** Postgres 17.11 plus Neon's `wsproxy` (pinned by
  digest). `getDb()` routes localhost connections through the proxy, so one
  `DATABASE_URL` serves the app, tests, and the Prisma CLI.
- **Biome 2.6 settings:** `useTailwindSortedClasses` (nursery) for class
  order; `noRestrictedImports` overrides keep server-only imports out of client
  code. `.claude/agents` and `.claude/skills` are excluded from Biome, because
  its Markdown formatter breaks their YAML frontmatter.

## Consequences

- Integration tests run on Node, not workerd: a Workers-only behavior can pass
  in tests and fail in the dev server. The E2E tests run against workerd and
  cover the critical flows.
- Upgrading Prisma: check that the generated client still imports
  `.wasm?module` and that the Vitest plugin still matches.
- The placeholder home route imports `@/server/health` directly and is
  exempted from the server-only import rule in `biome.json`. Step 2 replaces
  that page and removes the exemption.
