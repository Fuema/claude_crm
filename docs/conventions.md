# Conventions

Read this before writing any component, type, or style.

## Naming

| Item                    | Convention             | Example                                                          |
| ----------------------- | ---------------------- | ---------------------------------------------------------------- |
| Components              | PascalCase             | `UserCard`                                                       |
| Props types             | `<Component>Props`     | `UserCardProps`                                                  |
| Functions               | camelCase              | `formatDate`                                                     |
| Hooks                   | camelCase, `use…`      | `useCustomers`                                                   |
| Stores (TanStack Store) | `…Store`               | `uiPreferencesStore`, `dealBoardStore`                           |
| Server functions        | camelCase verb + noun  | `listCustomers`, `archiveCustomer`                               |
| Prisma models           | PascalCase singular    | `Customer`, `Deal` (table `customers`)                           |
| Zod schemas             | camelCase, `…Schema`   | `customerFormSchema`                                             |
| Constants               | UPPER_SNAKE_CASE       | `MAX_PAGE_SIZE`                                                  |
| Types                   | PascalCase             | `Customer`, `CustomerListParams`                                 |
| Event props             | `on…`                  | `onSelect`                                                       |
| Handlers                | `handle…`              | `handleSelect`                                                   |
| Booleans                | `is/has/can…`          | `isLoading`, `hasError`                                          |
| Route files             | TanStack Router naming | `$customerId.tsx`, `_authenticated.tsx`, `__root.tsx`            |
| Files                   | kebab-case             | `customer-card.tsx`, `use-customers.ts`, `customer-functions.ts` |

The file name is kebab-case even when it exports a PascalCase component.
(shadcn/ui already generates kebab-case files, e.g. `components/ui/alert-dialog.tsx`.)

App-specific constants (e.g. `APP_NAME`) live in `src/lib/app-config.ts`, kept
in sync with `docs/project.md` (Section 1).

## Components

- Function components only. No class components (except an error boundary
  if the chosen library requires one).
- One component per file. Small private helpers in the same file are fine.
- Use **named exports**. No default exports (except where a tool requires
  them).
- Define props with an `interface <Component>Props`. Destructure props in the
  signature.
- Keep components under ~150 lines. Beyond that, extract subcomponents or a hook.
- Components in `components/` are presentational: data in via props, events
  out via callbacks. No data fetching, no business rules.
- Put logic in hooks, not in JSX. JSX should read like a layout.
- Every list item gets a stable `key` from data, never the array index.

## TypeScript

- `strict` mode is on. Keep it on.
- Never use `any`. Use `unknown` and narrow it.
- Give public contracts (props, service inputs/outputs, exported functions)
  explicit types.
- Do not use `@ts-ignore` / `@ts-expect-error` without a comment explaining
  why. Fix the error instead whenever possible.
- Avoid type assertions (`as`). Prefer type guards.
- Prefer union types over enums: `type Status = 'active' | 'inactive'`.
- Derive types instead of duplicating them (`z.infer`, `Pick`, `Omit`).

## Styling (Tailwind CSS)

- Style with Tailwind utility classes only. No CSS Modules, styled-components,
  or new global CSS (the theme variables in `src/styles.css` are the exception).
- Use the theme tokens shadcn/ui defines (`bg-background`, `text-foreground`,
  `bg-primary`, `text-muted-foreground`, `border`, `ring`, `rounded-md`…).
  Never hardcode colors (`#3b82f6`, `bg-blue-500`) or arbitrary values
  (`p-[13px]`) unless there is no token for it. Biome's `noTailwindRawColors`
  fails `bun run check` on raw palette colors.
- Combine conditional classes with `cn()` from `lib/utils.ts` (re-exports the
  `cn` package, shadcn's replacement for clsx + tailwind-merge). Never build
  class strings with template literals.
- No inline `style={{…}}`, except for values computed at runtime (e.g. a
  progress width).
- Build mobile-first; add `sm:`, `md:`, `lg:` on top.
- Light and dark themes come from the CSS variables. Never use `dark:`
  overrides with hardcoded colors.
- Keep class lists readable; if a pattern repeats, extract a component
  instead of copying the classes.

## UI Components (shadcn/ui)

- Build UI from shadcn/ui components first (`Button`, `Input`, `Dialog`,
  `Table`, `Form`, `Select`, `Sonner` toasts, etc.). Do not hand-build a
  control that shadcn/ui already provides.
- shadcn/ui components live in `src/components/ui/` and are added with the
  CLI: `bunx --bun shadcn@latest add <component>`. **Ask before adding one**, since
  it can add dependencies.
- `components/ui/` is not linted (kept as the CLI ships it, as in the frontend
  template) but is formatted by Biome; run `bun run check:fix` after `shadcn add`.
- Treat `components/ui/` as a shared design system: change a primitive only
  for a project-wide reason, never for one screen. For one-off variations,
  pass `className` or wrap the primitive in a new component outside `ui/`.
- Add variants with `cva` (class-variance-authority) inside the primitive,
  following the existing pattern (e.g. `Button` variants).
- Icons: `lucide-react` only.
- Composite app components (data table, page header, confirm dialog, empty
  state) live in `src/components/` and are built from `ui/` primitives.

### Shared App Components

`src/components/` holds these shared components, copied from the frontend
template (`claude_frontend_solution`). Reuse them instead of rebuilding the
same pattern in a feature. They render on the server too (SSR), so they never
touch `window` or `document` during render; a `useSyncExternalStore` always
gets a `getServerSnapshot` (see `hooks/use-mobile.ts`).

| Component                 | Use it for                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PageHeader`              | The page's `<h1>` plus its actions (e.g. an "Add customer" button).                                                                                                                         |
| `EmptyState`              | Saying what is missing and offering the next action, when a list has no rows.                                                                                                               |
| `ErrorState`              | Reporting a load failure: `role="alert"`, a safe message, an optional "Try again" button.                                                                                                   |
| `ConfirmDialog`           | Destructive confirmations. It names the record, stays open while `isPending`, and the caller closes it (`onOpenChange(false)`) only on success.                                             |
| `FormDialog`              | A dialog shell for a form. The feature's form gets `id={formId}`; the footer submit button uses `form={formId}`. The feature owns react-hook-form (validation, submit, closing on success). |
| `DataTable`               | Any server-paginated list. Import from `@/components/data-table`. See "Data table contract" below.                                                                                          |
| `GenericTable`            | A small list loaded whole and searched, sorted, paged, and selected in the browser. Import from `@/components/generic-table`. See "Generic Table Contract" below.                           |
| `RouteError` / `NotFound` | Already provided by the router defaults (see `docs/architecture.md`); do not duplicate them in a feature.                                                                                   |
| `TextField`               | A labelled text input bound to a react-hook-form field (label, description, and error linked).                                                                                              |
| `CenteredCard`            | A page outside the app shell (sign-in, sign-up, invitations): one card, as the page's `<main>`.                                                                                             |

#### Data Table Contract

- **Server-side only.** Every value is controlled by props: `pagination`
  (`{ page, pageSize, total }`, `page` is 1-based), a single-column `sorting`
  (`{ id, desc }` or `null`), and `search` (`{ value, onChange, label? }`;
  `onChange` fires 300 ms after the user stops typing; omit `search` to hide
  the box).
- The page that renders a `DataTable` keeps that state in URL search params
  (`validateSearch`) and resets to page 1 when the search or a filter changes.
  `validateSearch` should limit `pageSize` to `PAGE_SIZE_OPTIONS`.
- After a delete empties the last page, the table shows "No rows on this page."
  with pagination to go back; it shows the empty state only when `total` is 0.
- A visually hidden status region announces the result summary ("Showing 1–10
  of 42", "No results", "Loading") to screen readers.
- Build columns once, at module scope, with
  `createDataTableColumnHelper<TData>().columns([...])` so they stay stable
  across renders. Never build them in a factory or `useMemo`.
- Cells that need page callbacks (row actions) get them through the
  `DataTable` `meta` prop, e.g. `meta={{ onEditRow, onDeleteRow }}`, and read
  them with `table.options.meta?.onEditRow`:

```tsx
helper.display({
  id: 'actions',
  cell: ({ row, table }) => (
    <CustomerRowActions
      customer={row.original}
      onEdit={table.options.meta?.onEditRow}
      onDelete={table.options.meta?.onDeleteRow}
    />
  ),
})
```

- The `TableMeta` augmentation lives in `src/components/data-table/types.ts`.
  A new kind of row callback is added there, generically named and optional.
  See `features/customers/components/customer-columns.tsx`.
- Sorting is opt-in per column: add `enableSorting: true`, because only the
  server knows what it can sort.
- Feature-specific filters (e.g. a status `Select`) go in the `toolbar`
  prop, next to the search box.
- The table itself covers the loading (skeleton rows), empty (`emptyState`
  slot, defaults to "No results") and error (`errorMessage` + `onRetry`)
  states, so the feature does not re-implement them.
- Built on TanStack Table v9 (`useTable`, `tableFeatures({ rowSortingFeature })`).
  Its bundled docs are in `node_modules/@tanstack/react-table/skills/`.

#### Generic Table Contract

- **Client-side.** The page passes every row as `data`; the table searches,
  sorts, pages, and selects in the browser. Choose it only for a list small
  enough to load whole (up to a few hundred rows). Choose `DataTable` for any
  list the server pages.
- Build columns once, at module scope, with
  `createGenericTableColumnHelper<TData>().columns([...])`. Sorting is opt-in
  per column (`enableSorting: true`).
- Cells that need page callbacks get them through the `meta` prop, as in
  `DataTable`.
- `selection` turns on the checkbox column: `getRowLabel` names each checkbox
  ("Select Ada Lovelace") and `actions(selected)` renders the buttons shown
  while rows are selected (e.g. "Delete 3 contacts"). Rows that leave `data`
  drop out of the selection.
- Search, sort, page, and page size are kept by the table by default. To keep
  them in the URL, pass `state` and `onStateChange` (`GenericTableState`).
  When the table only corrects the page (it no longer exists after a
  delete), `onStateChange` gets `{ replace: true }`: navigate with `replace`
  so no history entry is added. Row selection always stays inside the table.
- **Searching clears the selection**, so an action never reaches rows the
  search hides. Searching or sorting goes back to page 1.
- Loading, empty, no-matches, and error states are built in, as in `DataTable`.
- Shared parts (pagination, toolbar, sort button) come from
  `@/components/data-table`. See the contacts section of the customer page.

## Dependencies

**Ask before adding any package.** When proposing one, confirm that:

1. No existing dependency already solves the problem.
2. The functionality is not trivial to write in a few lines.
3. The package is actively maintained and widely adopted.
4. The package is not abandoned or suspicious.

## Code Hygiene

- Code is linted and formatted with Biome (`bun run check:fix`; `bun run check`
  in CI). Do not hand-format or debate style Biome already decides. Tailwind
  classes are sorted by Biome's `useTailwindSortedClasses` rule.
- A rule may be silenced only for deliberate code, with the reason:
  `// biome-ignore lint/<group>/<rule>: <why>`.
- No `console.log` in committed code. Use the logger in `lib/logger.ts`
  (server logs go to Workers logs; never log personal data).
- No commented-out code. Delete it; Git keeps history.
- Comments explain _why_, not _what_.
