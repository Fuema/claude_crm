# Quality: Testing, UI Validation, Accessibility, Performance

Read this before writing tests or verifying UI work.

## Test Types

Tools: **Vitest** (run with `bun run test`, never `bun test`), React Testing
Library, Playwright + `@axe-core/playwright`.

| Type        | What                                                 | Where                                                    | Environment                   |
| ----------- | ---------------------------------------------------- | -------------------------------------------------------- | ----------------------------- |
| Unit        | Pure functions, Zod schemas, mappers                 | Next to the file (`*.test.ts`)                           | jsdom (Node under `server/`)  |
| Component   | Components, hooks, pages                             | Next to the file (`*.test.tsx`)                          | jsdom                         |
| Integration | Feature services and middleware with a real database | `features/*/server/*.test.ts`, `src/server/**/*.test.ts` | Node + test Postgres          |
| E2E         | Critical flows in `docs/project.md` Section 7        | `src/tests/e2e/`                                         | Browser against `bun run dev` |

`vitest.config.ts` has two projects: **server** (Node; `src/server/**` and
`features/*/server/**`) and **client** (jsdom; everything else). The server
project points `DATABASE_URL` at `TEST_DATABASE_URL` (`crm_test`) in
`src/tests/setup-server.ts`, and reaches it through the Neon proxy like the
app does, so `bun run db:up` must be running. Before the server project runs,
`src/tests/global-setup-server.ts` applies the migrations to `crm_test` and
empties every table; server test files then run one at a time.

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
- The database is emptied once per run, so every test creates its own data
  with unique emails and never depends on other tests' rows.
- `src/tests/auth-test-kit.ts`: `createAuthTestKit()` (Better Auth on the test
  database, emails captured in `sentEmails`) and `createSignedInUser(kit, {
  workspaceName })` (a verified user with session headers). Feature factories
  (`createCustomer(db, overrides)`) go in `src/tests/factories/`.
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
- After a navigation, assert something on the new page (usually its heading)
  before typing: pages load their code on demand, so the old page can still
  be showing and would receive the input.
- Tests are independent: each signs up or uses its own seeded workspace.
- Import `test` and helpers from `src/tests/e2e/fixtures.ts`:
  - `test` gives every page its own client IP, so the per-IP auth rate
    limit does not count other tests (use `useOwnClientIp` for extra pages).
  - `open(page, url)` for full page loads: it waits for hydration, so typing
    is not reset and clicks are not lost.
  - `goToNav(page, name)` opens the mobile sidebar when needed.
  - `linkFromEmail(request, to, subject)` reads the link from Mailpit.
  - `signUpAndVerify(page, …)` ends signed in on the home page.
- Both projects run: `desktop` (Chrome) and `mobile` (Pixel 7).

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
