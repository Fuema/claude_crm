# Project Profile

What the application is: its users, domain, rules, and features. Every other
document describes *how* to build; this one describes *what*. Read it at the
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
  cookie. <!-- TODO: social sign-in? email verification? password reset by
  email (needs an email provider)? -->
- **Workspaces:** Better Auth organization plugin. <!-- TODO: how is a
  workspace created: by any user at sign-up, or only by invitation? -->
- **Error format:** Server functions throw `AppError` with a code from
  Section 6's codes (see `docs/data-and-api.md`).
- **Environments:** local, preview (per pull request), production.
  <!-- TODO: custom domain per environment -->

## 3. Domain Terms

| Term (UI)  | Code name    | Meaning                                                    |
|------------|--------------|------------------------------------------------------------|
| Workspace  | `Tenant`     | One company's isolated space in the CRM. Owns all business data. |
| User       | `User`       | A sales staff member who signs in.                         |
| Member     | `Member`     | A user's membership in a workspace.                        |
| Customer   | `Customer`   | A company the business sells to.                           |
| Customer status | `CustomerStatus` | `active` or `archived`. Shown as "Active" / "Archived". Customers are archived, never deleted. |
| Contact    | `Contact`    | A person who works at a customer. Belongs to exactly one customer. |
| Deal       | `Deal`       | A potential sale to a customer that moves through stages. Belongs to exactly one customer. |
| Stage      | `DealStage`  | Where a deal is: Lead → Qualified → Proposal → Negotiation → Won / Lost (`lead`, `qualified`, `proposal`, `negotiation`, `won`, `lost`). |
| Value      | `value`      | The deal's amount in its own currency (EUR, USD, or GBP). Amounts in different currencies are never converted or added together. |
| Activity   | `Activity`   | A call, meeting, email, or task logged against a customer, contact, or deal. <!-- TODO: confirm whether other activity types exist --> |
| Invoice    | `Invoice`    | A bill. <!-- TODO: issued to a customer, a won deal, or both? line items? statuses? --> |

### App-specific wording

| Say       | Never say                    | Notes |
|-----------|------------------------------|-------|
| customer  | client, account              | "Account" is also avoided in code (`Customer`, not `Account`). |
| deal      | opportunity, lead (for the record) | "Lead" is only the first stage. |
| workspace | organization, tenant, company | "Tenant" is the code name only, never UI text. |

## 4. Entities and Fields

Every tenant-owned entity also has `tenantId`, `createdAt`, and `updatedAt`
(set by the server, never shown in forms).

### Customer

| Field (UI)    | Code name    | Type     | Rules                         |
|---------------|--------------|----------|-------------------------------|
| —             | `id`         | string   | Assigned by the server        |
| Name          | `name`       | string   | Required, unique within the workspace including archived customers, case-insensitive (`NAME_TAKEN`) |
| Industry      | `industry`   | string   | Optional, free text           |
| Website       | `website`    | string   | Optional, an `http://` or `https://` URL |
| Email         | `email`      | string   | Optional, valid email         |
| Phone         | `phone`      | string   | Optional, free format, at most 30 characters |
| Address       | `address`    | string   | Optional, free text (one line) |
| Status        | `status`     | `'active' \| 'archived'` | Set by the server: `active` on create; changed only by Archive / Restore, not in the form |

### Contact

| Field (UI)    | Code name    | Type     | Rules                         |
|---------------|--------------|----------|-------------------------------|
| —             | `id`         | string   | Assigned by the server        |
| —             | `customerId` | string   | The customer the contact belongs to; set on create, never changed |
| First name    | `firstName`  | string   | Required                      |
| Last name     | `lastName`   | string   | Required                      |
| Job title     | `jobTitle`   | string   | Optional, free text           |
| Email         | `email`      | string   | Optional, valid email, not unique |
| Phone         | `phone`      | string   | Optional, free format, at most 30 characters |

### Deal

| Field (UI)    | Code name    | Type     | Rules                         |
|---------------|--------------|----------|-------------------------------|
| —             | `id`         | string   | Assigned by the server        |
| Title         | `title`      | string   | Required                      |
| Customer      | `customerId` | string   | Required, an active customer; fixed after create |
| Contact       | `contactId`  | string \| null | Optional, one of the customer's contacts; cleared when that contact is deleted |
| Value         | `value`      | decimal  | Required, from 0 to 999,999,999.99, at most 2 decimals. Stored as `Decimal(12,2)`, never a float |
| Currency      | `currency`   | `'EUR' \| 'USD' \| 'GBP'` | Required, defaults to `EUR` |
| Stage         | `stage`      | `DealStage` | Required, defaults to `lead` |
| Expected close date | `expectedCloseDate` | date (`YYYY-MM-DD`) | Optional |

### Activity

<!-- TODO: fields (UI label, code name, type, rules) -->

### Invoice

<!-- TODO: fields (UI label, code name, type, rules). Invoice PDFs are a
likely use of R2. -->

## 5. Features

| Feature    | Folder                     | Status  | Notes |
|------------|----------------------------|---------|-------|
| Shell      | `src/features/shell/`      | Planned | App layout (header, sidebar, skip link, workspace switcher). Not a business feature |
| Auth       | `src/features/auth/`       | Planned | Sign up, sign in, sign out, session restore, active workspace |
| Customers  | `src/features/customers/`  | Planned | Build order 1, **reference feature**. List (search by name, status filter, sort by name, paginate), details, create, edit, archive, restore |
| Contacts   | `src/features/contacts/`   | Planned | Build order 2. A Contacts section on the customer details page: list (search, sort), add, edit, delete |
| Deals      | `src/features/deals/`      | Planned | Build order 3. List, details with a stage control, create, edit, delete, Deals section on the customer page, pipeline board |
| Activities | `src/features/activities/` | Planned | Build order 4 |
| Invoices   | `src/features/invoices/`   | Planned | Build order 5 |

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
3. **Delete or archive is decided per feature.** <!-- TODO: decide for
   Activities and Invoices -->
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
14. <!-- TODO: uniqueness rules for Activities and Invoices -->

### Error codes

| Code                | When |
|---------------------|------|
| `UNAUTHENTICATED`   | No valid session. |
| `NO_ACTIVE_WORKSPACE` | Signed in, but no active workspace is selected. |
| `NOT_FOUND`         | The record does not exist **in the active workspace**. |
| `VALIDATION_FAILED` | Input failed validation; `details` holds field errors. |
| `NAME_TAKEN`        | Customer name already used in the workspace. |
| `CUSTOMER_ARCHIVED` | Change attempted on an archived customer or its contacts/deals. |
| `RATE_LIMITED`      | Too many requests (see `docs/resiliency.md`). |
| `CONFLICT`          | Same `Idempotency-Key` reused with a different request. |

## 7. Critical User Flows (E2E)

Each flow has a Playwright test (see `docs/quality.md`).

1. Sign up, sign in, and sign out.
2. A user of workspace A cannot see workspace B's customers (two seeded
   workspaces).
3. Create and edit a customer (including validation errors), archive and
   restore it.
4. Add a contact to a customer.
5. Create a deal and move it through its stages.
6. Create an invoice. *(Planned with Invoices.)*
