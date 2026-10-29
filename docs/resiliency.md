# Resiliency: Rate Limits, Idempotency, Outbox, Files, Real-Time

Read this before adding rate limits, idempotency, events, background work,
file storage, or real-time features.

**Add each mechanism when the first feature needs it, not before.** The stack
includes all of them; a section below becomes active when its first user is
built. Record that in the section's **Status**.

## Rate Limiting (Upstash Redis)

**Status:** planned — first user: sign-in and sign-up.

- `@upstash/ratelimit` + `@upstash/redis` over **REST** (works in Workers; no
  TCP connection).
- Applied as server-function middleware (`rateLimitMiddleware`) and in the
  Better Auth handler for sign-in and sign-up.
- Keys: per user and workspace for server functions (`rl:fn:<tenantId>:<userId>`),
  per IP for anonymous auth routes (`rl:auth:<ip>`, IP from `CF-Connecting-IP`).
- Over the limit → `AppError('RATE_LIMITED')`, shown as "Too many attempts.
  Wait a minute and try again."
- If Redis is unreachable, the request **is allowed** and the failure is
  logged (fail open). <!-- TODO: confirm fail-open for auth routes. -->
- Limits live in one place (`src/server/middleware/rate-limit.ts`).
  <!-- TODO: decide limits per route. -->

## Idempotency

**Status:** planned — first user: create customer.

- The client creates one key per user action (`crypto.randomUUID()` when the
  form opens or the action starts) and sends it with the mutation. A retry of
  the same action reuses the key; a new action gets a new key.
- `idempotencyMiddleware` stores `idem:<tenantId>:<key>` in Redis:
  1. Key missing → set it to `in-progress` with `SET NX` and a TTL, run the
     handler, store the result (24 h TTL).
  2. Key holds a result → return the stored result without running again.
  3. Key is `in-progress` → `CONFLICT` ("This request is already being
     processed.").
  4. Same key, different input (hash mismatch) → `CONFLICT`.
- Only successful results are stored; a failed attempt deletes the key so the
  user can retry.
- Inside one database transaction, prefer database constraints (unique
  indexes) over Redis: Redis protects against retries, constraints protect
  the data.

## Transactional Outbox

**Status:** planned — first user: <!-- TODO: e.g. invoice issued → email -->

Use it when a change must cause something outside the database (an email, a
webhook, a search index update). Never call the outside service inside the
request that changes the data.

```
server function ──tx──▶ business rows + Outbox row (same transaction)
Cron Trigger (every minute) ──▶ relay: read pending rows ──▶ Cloudflare Queue
Queue consumer ──▶ do the work ──▶ mark the row done (or retry)
```

- **Write:** `enqueueEvent(tx, { type, tenantId, payload })` inside
  `db.$transaction(async (tx) => …)`. The business change and the event are
  committed together or not at all. This replaces a dual write.
- **Relay:** the Worker's `scheduled` handler picks pending rows with
  `FOR UPDATE SKIP LOCKED`, sends them to the queue in a batch, marks them
  `sent`. Without the relay, nothing is ever delivered.
- **Consumer:** the Worker's `queue` handler. Delivery is **at least once and
  not ordered**: every consumer is idempotent (it checks the event id or the
  target state before acting), and never assumes events arrive in order.
- Failed messages are retried by the queue, then go to a dead-letter queue.
  <!-- TODO: alerting on the dead-letter queue. -->
- `Outbox` columns: `id`, `tenantId`, `type`, `payload` (JSON), `status`
  (`pending` | `sent` | `done` | `failed`), `attempts`, `lastError`,
  `createdAt`, `processedAt`.
- Payloads carry ids, not personal data snapshots, where possible.

## Files (Cloudflare R2)

**Status:** planned — first user: <!-- TODO: e.g. invoice PDFs, customer contracts -->

- Accessed through the R2 binding in server code only.
- Object keys always start with the workspace: `<tenantId>/<feature>/<id>/<file>`.
  A key from the client is never trusted; the server builds it.
- Uploads and downloads go through server functions or short-lived signed URLs,
  after a session and tenant check. Buckets are never public.
- Validate type and size on the server before storing.

## Real-Time (Durable Objects)

**Status:** planned — no user yet. <!-- TODO: e.g. live pipeline board -->

- One Durable Object per workspace (or per board) holds WebSocket
  connections and broadcasts changes.
- The object authenticates each connection with the session and checks the
  workspace before accepting it.
- The database stays the source of truth; messages say *what changed*, and
  clients refetch through TanStack Query.

## Testing These Mechanisms

From `docs/quality.md`, plus:

- Idempotency: the same key twice runs the handler once; a different body with
  the same key returns `CONFLICT`.
- Outbox: a failed transaction leaves no outbox row; a delivered event
  processed twice has the effect of once.
- Rate limit: the limit plus one returns `RATE_LIMITED`.
- Network retries and duplicate submissions are simulated in integration tests.
