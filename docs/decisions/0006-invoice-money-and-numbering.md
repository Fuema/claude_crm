# 0006 – Invoice money and numbering

## Context

Invoices are the first feature that does arithmetic on money: line amounts,
subtotal, tax, and total (`docs/project.md`, Section 4). Deals only store and
show a value. A JavaScript `number` cannot hold every amount up to
999,999,999.99 × 100 lines exactly, and float rounding would let the form's
preview disagree with the saved invoice by a cent.

Invoice numbers must be sequential per workspace and never reused (rule 29),
even when two members send drafts at the same moment.

## Decision

- **Amounts are decimal strings** (`"1234.50"`) between server and client.
  The database stores `Decimal(12, 2)` (tax rate `Decimal(5, 2)`); line
  amounts and totals are computed, never stored.
- **Arithmetic is in whole cents with `bigint`**, in one module shared by the
  server and the form: `src/features/invoices/types/invoice-money.ts`.
  quantity × unit price is rounded half up to cents per line; tax is rounded
  half up once, on the subtotal. The server's result is authoritative; the
  form's preview uses the same functions, so they cannot differ.
- **`formatMoney` accepts a decimal string.** It formats the whole part as a
  `bigint` with `Intl.NumberFormat#formatToParts` and puts the cents in the
  fraction part, so a large amount is never turned into a float.
- **Numbers come from a per-workspace counter** (`InvoiceCounter`,
  `lastNumber`). Send runs in one transaction: upsert-and-increment the
  counter (the row lock serializes concurrent sends in a workspace), then a
  conditional `updateMany` from `draft` to `sent`. If the draft was sent or
  voided meanwhile, the transaction rolls back and the counter increment with
  it, so no number is skipped. `@@unique([tenantId, number])` is the
  safety net. Format: `INV-` + at least 4 digits.

## Consequences

- Any new money calculation goes through `invoice-money.ts` (or a sibling in
  the same style), never through `number`.
- Numbers have no gaps from failed sends; a voided sent invoice keeps its
  number, and a voided draft never had one.
- The counter row is a hot spot only within one workspace, and only while a
  send's transaction is open.
- Tested in `invoice-money.test.ts` (rounding, the largest amounts) and
  `invoice-service.test.ts` (concurrent sends get distinct consecutive
  numbers; numbering is per workspace).
