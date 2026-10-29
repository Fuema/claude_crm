---
name: security-review
description: Review the application for security problems (tenant isolation, auth, secrets, injection, XSS, unsafe URLs, vulnerable dependencies). Use when asked for a security review or when a change touches auth, tenancy, server functions, or user-supplied content.
---

# Security Review

1. Read `docs/security.md`.
2. Search the code for:
   - Server functions without the tenant (or auth) middleware or without a Zod
     input validator.
   - `getDb()` (unscoped) used in a feature service; `tenantId` read from input,
     search params, or headers.
   - Prisma rows returned to the client without mapping; internal columns
     leaking.
   - `$queryRawUnsafe` / `$executeRawUnsafe`, or raw SQL built from strings.
   - Prisma, `src/server/`, or `cloudflare:workers` imported from client code.
   - Secrets in source, `wrangler.jsonc` `vars`, or `VITE_*` variables.
   - Personal data or session data in `localStorage` / `sessionStorage` or a
     persisted store.
   - `dangerouslySetInnerHTML` without DOMPurify; URLs or `href` from user
     input without a scheme check; `?redirect=` without `isInternalPath`.
   - R2 keys, Redis keys, or Durable Object names without the `tenantId`.
   - Logging of passwords, cookies, tokens, or personal data.
   - Authorization decided only in the UI.
3. Run `bun audit` and list high/critical findings.
4. Report each issue with severity (Critical / High / Medium / Low), location,
   risk, and fix. Do not change code unless the user asks.
