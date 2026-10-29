---
name: performance-audit
description: Audit performance (database queries, server functions, SSR, bundle size, rendering). Use when asked for a performance audit, or when a screen or request feels slow.
---

# Performance Audit

1. Read the Performance section in `docs/quality.md`.
2. **Database:** look for N+1 queries, missing indexes (every list query
   should use an index starting with `tenantId`), selecting unneeded columns,
   and filtering or paging in JavaScript instead of SQL.
3. **Server functions:** count database round trips per call; look for
   sequential awaits that could run in parallel, and outside calls made inside
   a request that belong in the outbox.
4. **SSR and loading:** pages that render a spinner on first load instead of
   prefetching in the loader; request waterfalls between parent and child
   routes.
5. **Bundle:** run `bun run build`, check client chunk sizes against the
   budget, and look for server code or large libraries in client chunks.
6. **Rendering:** components that re-render on every keystroke or parent
   update, long lists without virtualization, heavy work inside render.
7. **Measure** before and after any fix. Do not memoize without a measured need.
8. Report findings ordered by impact, each with evidence and a proposed fix.
