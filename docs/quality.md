# Quality: Testing, UI Validation, Accessibility, Performance

Read this before writing tests or verifying UI work.

## Test Types

Tools: **Vitest** (run with `bun run test`, never `bun test`), React Testing
Library, Playwright + `@axe-core/playwright`.

| Type        | What                                         | Where | Environment |
|-------------|----------------------------------------------|-------|-------------|
| Unit        | Pure functions, Zod schemas, mappers         | Next to the file (`*.test.ts`) | Node |
| Component   | Components, hooks, pages                     | Next to the file (`*.test.tsx`) | jsdom |
| Integration | Feature services and middleware with a real database | `features/*/server/*.test.ts`, `src/server/**/*.test.ts` | Node + test Postgres |
| E2E         | Critical flows in `docs/project.md` Section 7 | `src/tests/e2e/` | Browser against `bun run dev` |

<!-- TODO (step 1): Vitest projects for jsdom vs node, and how integration
tests reach local Postgres (Neon proxy or a pg adapter in tests). -->

## Writing Tests

For every behavior change:

1. Prefer test-first: write a failing test → implement → see it pass → refactor.
2. Run: type check → `bun run check` → tests → relevant E2E tests.
3. Fix every failure before declaring the task complete. Never delete or skip
   a test to make the suite pass.

Rules:

- Test behavior the user sees, not implementation details.
- Query by role, label, or text, not by CSS class or test id unless there is
  no accessible alternative.
- Name tests as sentences: `it('shows an error when the save fails')`.
- Cover the loading, empty, error, and success states of data screens.

### Integration tests (server)

- Test the **service** with a tenant-scoped db; test middleware separately.
  No HTTP needed.
- Each test file gets a clean database state (truncate tenant tables or run
  each test in a rolled-back transaction).
- Create data with factories in `src/tests/factories/`
  (`createTenant()`, `createCustomer(db, overrides)`).
- **Every feature has a cross-tenant test.**
- Test every business rule and error code in `docs/project.md` Section 6 that
  the feature owns.

### Component tests

- Mock the feature's **server functions** at the module boundary
  (`vi.mock('../server/customer-functions')`). This is the one allowed module
  mock; do not mock hooks or components.
- Render through a `renderWithProviders` / `renderApp(path)` helper with a
  fresh `QueryClient`.

## UI Validation

For significant UI changes:

1. Run the app (`bun run db:up`, `bun run dev`) with seeded data.
2. Use realistic data: empty lists, very long text, many rows, error states.
3. Check **mobile (375 px)** and **desktop (1280 px)**, light and dark.
4. Check the server-rendered page has no hydration warnings in the console.
5. Fix visual regressions before completion.

## E2E Tests

- Each critical flow in `docs/project.md` Section 7 has a Playwright test,
  with an axe scan on each page it visits.
- Select elements by role or label, never by CSS class.
- Tests are independent: each signs up or uses its own seeded workspace.

## Accessibility Baseline

Target: **WCAG 2.1 AA**. Every UI change must meet these rules:

- Semantic HTML: `button` for actions, `a` for navigation, real headings in
  order, `nav` / `main` / `header` landmarks.
- Every input has a visible `<label>` (placeholders are not labels).
- Everything works with the keyboard alone; focus is always visible.
- Dialogs trap focus and return it to the trigger when closed.
- Images have meaningful `alt` text, or `alt=""` if decorative.
- Text contrast is at least 4.5:1 (3:1 for large text), in both themes.
- Never use color alone to convey meaning (add an icon or text).
- Errors and status changes are announced (`role="alert"` / `aria-live`).
- Prefer native elements over ARIA. Give every `Dialog` / `AlertDialog` a
  `Title` and icon-only `Button`s an `aria-label`.

For a deeper review, use the `accessibility-review` skill.

## Performance

- Server: one database round trip per server function where possible; select
  only needed columns; every list query uses an index that starts with
  `tenantId`. No N+1 queries (use `include`/`select` or one batched query).
- Use loaders to prefetch so SSR returns content, not a spinner.
- Paginate, sort, and search in the database. Exception: a small list loaded
  whole into `GenericTable` (up to a few hundred rows).
- Keep route code splitting on; never import a page eagerly.
- Debounce search input (~300 ms).
- Read stores through selectors.
- Memoize only when there is a measured need.
- Budget: initial client JS under 250 KB gzipped. <!-- TODO: confirm -->

For a deeper review, use the `performance-audit` skill.
