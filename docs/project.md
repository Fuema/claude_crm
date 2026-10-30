# Project Profile

What the application is: its users, domain, rules, and features. Every other
document describes _how_ to build; this one describes _what_. Read it at the
start of every task.

<!-- TODO markers are open questions. Do not assume answers: ask. -->

---

## 1. Application

- **Name:** CRM
- **Purpose:** Manage customers, their contacts, and sales deals, log
  activities against them, and handle invoicing.
- **Tenancy:** Multi-tenant. Each company using the CRM is a **workspace**
  (code: `Tenant`, stored as a Better Auth organization). All business data
  belongs to exactly one workspace and is never visible to another.
- **Users:** Sales staff. A user belongs to one or more workspaces and works
  in one active workspace at a time. No roles yet (see Section 6, rule 1).
- **Origin:** Rebuilt from scratch on a new stack. The domain rules below were
  settled in the earlier `claude_crm_solution` project and carried over;
  only the tenant scope is new.

## 2. Platform

- **Server:** TanStack Start server functions on Cloudflare Workers. There is
  no separate REST API; the UI calls server functions (see
  `docs/data-and-api.md`).
- **Database:** Neon PostgreSQL through Prisma 7. Local development uses
  Docker (see `docs/devops.md`).
- **Authentication:** Better Auth, email and password, session in an httpOnly
  cookie. Email verification and password reset by email (rules 15–17).
  <!-- TODO: social sign-in? -->
- **Workspaces:** Better Auth organization plugin. Created at sign-up; others
  join by invitation (rules 18–22).
- **Email:** Resend's REST API in production; Mailpit locally
  (`http://localhost:8025`). Needs a sending domain verified in Resend before
  the first deployment. <!-- TODO: sending domain and from address -->
- **Rate limits:** sign-up, sign-in, and password reset requests (rule 23).
- **Error format:** Server functions throw `AppError` with a code from
  Section 6's codes (see `docs/data-and-api.md`).
- **Environments:** local, preview (per pull request), production.
  <!-- TODO: custom domain per environment -->

## 3. Domain Terms

| Term (UI)       | Code name        | Meaning                                                                                                                                  |
| --------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace       | `Tenant`         | One company's isolated space in the CRM. Owns all business data.                                                                         |
| User            | `User`           | A sales staff member who signs in.                                                                                                       |
| Member          | `Member`         | A user's membership in a workspace.                                                                                                      |
| Customer        | `Customer`       | A company the business sells to.                                                                                                         |
| Customer status | `CustomerStatus` | `active` or `archived`. Shown as "Active" / "Archived". Customers are archived, never deleted.                                           |
| Contact         | `Contact`        | A person who works at a customer. Belongs to exactly one customer.                                                                       |
| Deal            | `Deal`           | A potential sale to a customer that moves through stages. Belongs to exactly one customer.                                               |
| Stage           | `DealStage`      | Where a deal is: Lead → Qualified → Proposal → Negotiation → Won / Lost (`lead`, `qualified`, `proposal`, `negotiation`, `won`, `lost`). |
| Value           | `value`          | The deal's amount in its own currency (EUR, USD, or GBP). Amounts in different currencies are never converted or added together.         |
| Activity        | `Activity`       | A call, meeting, email, or task logged against a customer, optionally also against one of its contacts and one of its deals.             |
| Activity type   | `ActivityType`   | `call`, `meeting`, `email`, `task`. Shown as "Call", "Meeting", "Email", "Task".                                                         |
| Task            | (`type: 'task'`) | An activity to do by its date; it is open until marked done.                                                                             |
| Invoice         | `Invoice`        | A bill to a customer, optionally for one of its Won deals, with line items.                                                              |
| Invoice status  | `InvoiceStatus`  | `draft` → `sent` → `paid`, or `void`. Shown as "Draft", "Sent", "Paid", "Void".                                                          |
| Line item       | `InvoiceLine`    | One row of an invoice: description, quantity, unit price.                                                                                |
| Invoice number  | `number`         | `INV-0001`, sequential per workspace, given when the invoice is sent.                                                                    |

### App-specific wording

| Say       | Never say                          | Notes                                                          |
| --------- | ---------------------------------- | -------------------------------------------------------------- |
| customer  | client, account                    | "Account" is also avoided in code (`Customer`, not `Account`). |
| deal      | opportunity, lead (for the record) | "Lead" is only the first stage.                                |
| workspace | organization, tenant, company      | "Tenant" is the code name only, never UI text.                 |

## 4. Entities and Fields

Every tenant-owned entity also has `tenantId`, `createdAt`, and `updatedAt`
(set by the server, never shown in forms).

### Customer

| Field (UI) | Code name  | Type                     | Rules                                                                                               |
| ---------- | ---------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| —          | `id`       | string                   | Assigned by the server                                                                              |
| Name       | `name`     | string                   | Required, unique within the workspace including archived customers, case-insensitive (`NAME_TAKEN`) |
| Industry   | `industry` | string                   | Optional, free text                                                                                 |
| Website    | `website`  | string                   | Optional, an `http://` or `https://` URL                                                            |
| Email      | `email`    | string                   | Optional, valid email                                                                               |
| Phone      | `phone`    | string                   | Optional, free format, at most 30 characters                                                        |
| Address    | `address`  | string                   | Optional, free text (one line)                                                                      |
| Status     | `status`   | `'active' \| 'archived'` | Set by the server: `active` on create; changed only by Archive / Restore, not in the form           |

### Contact

| Field (UI) | Code name    | Type   | Rules                                                             |
| ---------- | ------------ | ------ | ----------------------------------------------------------------- |
| —          | `id`         | string | Assigned by the server                                            |
| —          | `customerId` | string | The customer the contact belongs to; set on create, never changed |
| First name | `firstName`  | string | Required                                                          |
| Last name  | `lastName`   | string | Required                                                          |
| Job title  | `jobTitle`   | string | Optional, free text                                               |
| Email      | `email`      | string | Optional, valid email, not unique                                 |
| Phone      | `phone`      | string | Optional, free format, at most 30 characters                      |

### Deal

| Field (UI)          | Code name           | Type                      | Rules                                                                                            |
| ------------------- | ------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| —                   | `id`                | string                    | Assigned by the server                                                                           |
| Title               | `title`             | string                    | Required                                                                                         |
| Customer            | `customerId`        | string                    | Required, an active customer; fixed after create                                                 |
| Contact             | `contactId`         | string \| null            | Optional, one of the customer's contacts; cleared when that contact is deleted                   |
| Value               | `value`             | decimal                   | Required, from 0 to 999,999,999.99, at most 2 decimals. Stored as `Decimal(12,2)`, never a float |
| Currency            | `currency`          | `'EUR' \| 'USD' \| 'GBP'` | Required, defaults to `EUR`                                                                      |
| Stage               | `stage`             | `DealStage`               | Required, defaults to `lead`                                                                     |
| Expected close date | `expectedCloseDate` | date (`YYYY-MM-DD`)       | Optional                                                                                         |

### Activity

| Field (UI) | Code name    | Type                | Rules                                                                     |
| ---------- | ------------ | ------------------- | ------------------------------------------------------------------------- |
| —          | `id`         | string              | Assigned by the server                                                    |
| Type       | `type`       | `ActivityType`      | Required, defaults to `call`                                              |
| Subject    | `subject`    | string              | Required, at most 200 characters                                          |
| Notes      | `notes`      | string              | Optional, free text, at most 5,000 characters                             |
| Date       | `date`       | date (`YYYY-MM-DD`) | Required. When it happened; for a task, when it is due. Defaults to today |
| Customer   | `customerId` | string              | Required, an active customer; fixed after create                          |
| Contact    | `contactId`  | string \| null      | Optional, one of the customer's contacts; cleared when it is deleted      |
| Deal       | `dealId`     | string \| null      | Optional, one of the customer's deals; cleared when it is deleted         |
| Done       | `done`       | boolean             | Tasks only (always false for other types); defaults to false              |

### Invoice

| Field (UI) | Code name    | Type                      | Rules                                                                                   |
| ---------- | ------------ | ------------------------- | --------------------------------------------------------------------------------------- |
| —          | `id`         | string                    | Assigned by the server                                                                  |
| Number     | `number`     | string \| null            | Set by the server when sent: `INV-` + 4+ digits, sequential per workspace, never reused |
| Customer   | `customerId` | string                    | Required, an active customer; fixed after create                                        |
| Deal       | `dealId`     | string \| null            | Optional, a **Won** deal of the same customer                                           |
| Currency   | `currency`   | `'EUR' \| 'USD' \| 'GBP'` | Required, defaults to the deal's currency or `EUR`                                      |
| Tax rate   | `taxRate`    | decimal (%)               | Required, 0 to 100, at most 2 decimals, defaults to 0                                   |
| Due date   | `dueDate`    | date (`YYYY-MM-DD`)       | Optional                                                                                |
| Notes      | `notes`      | string                    | Optional, at most 2,000 characters                                                      |
| Status     | `status`     | `InvoiceStatus`           | Set by the server: `draft` on create; changed only by Send / Mark as paid / Void        |
| Issued on  | `issuedAt`   | date                      | Set by the server when sent                                                             |
| Lines      | `lines`      | `InvoiceLine[]`           | At least one to send; at most 100                                                       |

**Invoice line:** description (required, at most 500 characters), quantity
(more than 0, at most 2 decimals), unit price (0 to 999,999,999.99, at most 2
decimals). Totals are computed by the server and never stored by the client:
line amount = quantity × unit price, rounded to cents; subtotal = sum of line
amounts; tax = subtotal × tax rate / 100, rounded to cents; total = subtotal +
tax. All amounts are `Decimal`, never floats (see
`docs/decisions/0006-invoice-money-and-numbering.md`).

## 5. Features

| Feature    | Folder                     | Status | Notes                                                                                                                                                    |
| ---------- | -------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell      | `src/features/shell/`      | Done   | App layout (header, sidebar, skip link, workspace switcher, user menu). Not a business feature. Dark mode deferred                                       |
| Auth       | `src/features/auth/`       | Done   | Sign up (creates a workspace), email verification, sign in, sign out, password reset, session restore                                                    |
| Workspaces | `src/features/workspaces/` | Done   | Active workspace and switcher, create a workspace, members page, invite by email, accept an invitation                                                   |
| Customers  | `src/features/customers/`  | Done   | Build order 1, **reference feature**. List (search by name, status filter, sort by name, paginate), details, create (idempotent), edit, archive, restore |
| Contacts   | `src/features/contacts/`   | Done   | Build order 2. A Contacts section on the customer details page: list (search, sort), add, edit, delete                                                   |
| Deals      | `src/features/deals/`      | Done   | Build order 3. List, details with a stage control, create, edit, delete, Deals section on the customer page, pipeline board                              |
| Activities | `src/features/activities/` | Done   | Build order 4. Activities section on the customer and deal pages, an Activities page with open tasks first, add, edit, mark done, delete                 |
| Invoices   | `src/features/invoices/`   | Done   | Build order 5. Invoices list and details, create and edit drafts with line items, send, mark as paid, void, Invoices section on the customer page        |

Update the status to `Done` when a feature meets the Definition of Done.

## 6. Business Rules

Do not invent rules that are not listed here; ask and add them.

1. **Every member of a workspace may create, edit, and delete its records.**
   There are no roles yet. <!-- TODO: roles and permissions (Better Auth
   organization roles: owner, admin, member?). The server enforces them; the UI
   only reflects them. -->
2. **All business data is scoped to one workspace.** A record from another
   workspace behaves as if it does not exist (`NOT_FOUND`, never `FORBIDDEN`,
   so ids from other workspaces leak nothing).
3. **Delete or archive is decided per feature:** customers are archived;
   contacts, deals, and activities are deleted; invoices are voided, never
   deleted (rules 4, 7, 11, 26, 30).
4. **Customers are archived, never deleted.** Archiving asks for confirmation
   in a dialog that names the customer; restoring does not. The customer list
   shows active customers by default; a status filter shows archived ones or
   all.
5. **An archived customer is read-only.** It cannot be edited until it is
   restored (`CUSTOMER_ARCHIVED`).
6. **Customer name is unique within the workspace**, archived customers
   included, ignoring case (`NAME_TAKEN`, shown on the name field).
7. **Deleting a contact is permanent**, after a confirmation dialog that
   names the contact.
8. **The contacts of an archived customer are read-only** (`CUSTOMER_ARCHIVED`).
9. **Contact email is not unique.** Two contacts may share an email.
10. **A deal can move from any stage to any stage**, including reopening a
    Won or Lost deal.
11. **Deleting a deal is permanent**, after a confirmation dialog that names
    the deal.
12. **The deals of an archived customer are read-only.** They are shown, but
    cannot be created, edited, moved, or deleted until the customer is
    restored (`CUSTOMER_ARCHIVED`).
13. **A deal's customer cannot change after it is created.** Its contact must
    be one of that customer's contacts (`VALIDATION_FAILED` otherwise);
    deleting the contact leaves the deal without one.
14. **Nothing about activities is unique.** Invoice numbers are unique per
    workspace (rule 29).

### Accounts and workspaces

15. **Email must be verified before the first sign-in.** Sign-up ends with
    "Check your email"; the link signs the user in. Signing in unverified
    shows a message and offers to send the link again.
16. **Passwords have at least 8 characters.** Email is unique across the
    whole CRM (one account per person, many workspaces). Sign-up never reveals
    whether an email already has an account: it always ends with "Check your
    email", and the existing account's owner gets a notice ("Someone tried to
    sign up with your email") instead of a second account.
17. **Password reset** is requested by email; the answer never reveals whether
    the account exists. The reset link expires after 1 hour.
18. **Sign-up creates a workspace** with the name the user enters; the user
    becomes its owner. A user who signs up from an invitation link is not asked
    for a workspace name.
19. **Any member may invite** others by email (no roles yet, rule 1). Invited
    users join as members. An invitation expires after 48 hours and can be
    accepted only by a signed-in user with the invited email.
20. **A user may belong to several workspaces** and works in one at a time
    (the active workspace, kept in the session). The header switches it. A
    signed-in user with no workspace is asked to create one.
21. **A user can create another workspace** at any time and becomes its owner.
22. Removing a member, leaving a workspace, and canceling an invitation come
    later. <!-- TODO -->
23. **Rate limits:** at most 10 sign-up, sign-in, or password reset requests
    per minute per IP address (`RATE_LIMITED`: "Too many attempts. Wait a
    minute and try again."). If the rate-limit store is unreachable, requests
    are allowed and the failure is logged.

### Activities

24. **An activity belongs to a customer**, and optionally to one of that
    customer's contacts and one of its deals (`VALIDATION_FAILED`
    otherwise). Its customer cannot change after it is created.
25. **The activities of an archived customer are read-only** (`CUSTOMER_ARCHIVED`):
    shown, but not added, edited, completed, or deleted until it is restored.
26. **Deleting an activity is permanent**, after a confirmation dialog that
    names it. Deleting a contact or deal leaves its activities without it.
27. **Only tasks can be done.** Marking a task done (or not done) is a
    separate action from editing. Open tasks are listed before everything
    else, by date; then the rest, newest first.

### Invoices

28. **Only a draft can be edited** (`INVOICE_NOT_EDITABLE`). A draft needs at
    least one line to be sent (`INVOICE_HAS_NO_LINES`).
29. **Sending gives the number and the issue date.** Numbers are sequential
    per workspace (INV-0001, INV-0002, …), never reused, even after a void.
30. **Statuses move forward only:** Draft → Sent (Send), Sent → Paid (Mark as
    paid), Draft or Sent → Void (Void, after a confirmation that names the
    invoice). Anything else is `INVALID_STATUS_CHANGE`. Invoices are never
    deleted; a voided draft has no number.
31. **A deal on an invoice must be a Won deal of the same customer**
    (`VALIDATION_FAILED`). If the deal is deleted, the invoice keeps its
    lines and loses the link.
32. **The invoices of an archived customer:** no new invoices, and its drafts
    are read-only (`CUSTOMER_ARCHIVED`); sent invoices can still be marked as
    paid or voided.
33. **Amounts are never converted between currencies**; lists show each
    invoice in its own currency (as for deal values).
34. Invoice PDFs and emailing invoices come later (R2 and the outbox).
    <!-- TODO -->

### Error codes

| Code                    | When                                                                            |
| ----------------------- | ------------------------------------------------------------------------------- |
| `UNAUTHENTICATED`       | No valid session.                                                               |
| `NO_ACTIVE_WORKSPACE`   | Signed in, but no active workspace is selected.                                 |
| `NOT_FOUND`             | The record does not exist **in the active workspace**.                          |
| `VALIDATION_FAILED`     | Input failed validation; `details` holds field errors.                          |
| `NAME_TAKEN`            | Customer name already used in the workspace.                                    |
| `CUSTOMER_ARCHIVED`     | Change attempted on an archived customer or its contacts/deals.                 |
| `RATE_LIMITED`          | Too many requests (see `docs/resiliency.md`).                                   |
| `CONFLICT`              | Same `Idempotency-Key` reused with a different request.                         |
| `INVOICE_NOT_EDITABLE`  | Change attempted on an invoice that is no longer a draft.                       |
| `INVOICE_HAS_NO_LINES`  | Sending a draft without line items.                                             |
| `INVALID_STATUS_CHANGE` | A status change rule 30 does not allow.                                         |
| `INTERNAL`              | An unexpected failure; the message is generic, details are only in server logs. |

## 7. Critical User Flows (E2E)

Each flow has a Playwright test (see `docs/quality.md`).

1. Sign up (with email verification), sign out, and sign in.
2. Invite a member: the invited person signs up from the email, accepts, and
   sees the workspace; the members page lists both.
3. Reset a forgotten password.
4. A user of workspace A cannot see workspace B's customers (two seeded
   workspaces). _(With Customers.)_
5. Create and edit a customer (including validation errors), archive and
   restore it.
6. Add a contact to a customer.
7. Create a deal and move it through its stages.
8. Log an activity and complete a task.
9. Create an invoice with line items, send it, and mark it as paid.
