# TedIS — Architecture & Decision Log

## Guiding principle
Ship a **modular monolith** that is *internally* structured like microservices (clean
domain boundaries) but *externally* deploys as one unit. Optimize for iteration speed and
type-safety now; keep the seams so we can extract services later without a rewrite.

---

## ADR-001 — Backend: Next.js + tRPC monolith, not separate NestJS
**Status:** Accepted.

**Context.** The stack options were "Next.js API routes" vs "separate NestJS service."

**Decision.** One Next.js 15 app exposing a **tRPC** API, backed by a framework-agnostic
service layer.

**Why not NestJS (yet):**
- A separate service adds a network boundary, its own deploy/scale/observability surface,
  CORS, and — worst — **duplicated types** between two codebases. Type drift is the #1
  source of runtime bugs in split TS stacks.
- Everything NestJS gives us (DI, layering, guards, pipes) we reproduce with plain modules:
  `services/` (business logic), `trpc/` (transport + authz middleware), `schema.ts` (Zod
  validation = pipes). SOLID without the framework tax.

**Why tRPC over REST:** end-to-end inferred types, one Zod schema validates on client and
server, no OpenAPI codegen step. React Query is built in via `@trpc/react-query`.
We still expose a thin **versioned REST edge** (`/api/v1/*`) for webhooks, OAuth callbacks,
and any future non-TS consumers.

**Escape hatch.** Because all business logic lives in `src/server/services/*` (zero
framework imports), extracting `messaging` or `search` into its own NestJS/Go service later
is a transport swap, not a rewrite.

**Consequences.** Single deploy artifact; Server Components call services directly (no HTTP
hop); one place to reason about auth.

---

## ADR-002 — Auth: custom session-based, not a turnkey provider
**Status:** Accepted.

The requirement set (passkeys + magic link + OAuth + TOTP MFA + refresh/rotation + device
management + login history + lockout) exceeds what any single drop-in gives cleanly.
We build on primitives instead of fighting a framework:
- **Password hashing:** argon2id (memory-hard, tuned params).
- **Sessions:** opaque, DB-backed, httpOnly + Secure + SameSite=Lax cookies, sliding
  expiry with absolute cap, server-side revocation (kills "can't log everyone out").
- **OAuth:** `arctic` (typed, minimal, PKCE).
- **Passkeys:** `@simplewebauthn/server`.
- **MFA/TOTP:** `otplib` + hashed backup codes.
- **CSRF:** double-submit token + Origin/Sec-Fetch checks on state-changing requests.
- **Rate limiting + lockout:** Redis sliding-window per IP + per-account.

Rationale detail lives with the code in Increment 2/3.

---

## ADR-003 — Data: PostgreSQL + Prisma, Redis for ephemeral/hot paths
- **Postgres** is the system of record. Prisma for typed access + migrations.
- **Redis** for: rate-limit counters, session hot-cache, feed fan-out cache, presence,
  pub/sub for realtime (notifications, chat, typing). Never the source of truth.
- **Soft delete** everywhere (`deletedAt`); **audit log** for privileged mutations.
- **Pagination** is cursor-based (keyset) everywhere — offset pagination does not scale.

## ADR-004 — Media: object storage + CDN, never the app server
Direct-to-S3/R2 presigned uploads; app never proxies bytes. `next/image` + CDN for
delivery. Images processed (resize/strip EXIF) via background jobs.

## ADR-005 — Background jobs: BullMQ on Redis
Email sending, feed fan-out, media processing, notification delivery, search indexing run
off the request path as idempotent jobs.

## Folder structure
```
src/
  app/                 # Next.js routes (thin — delegate to features/services)
  features/<domain>/   # UI + hooks + Zod schemas per domain (feed, auth, projects…)
  components/          # shared design-system components (shadcn-based)
  server/
    services/<domain>/ # business logic — the ONLY Prisma caller. Framework-agnostic.
    trpc/              # routers, context, authz middleware
    db/                # prisma client singleton, redis client
    jobs/              # BullMQ queues + workers
  lib/                 # cross-cutting utils (crypto, cursor, result types)
  config/              # env validation, constants
  styles/              # global css, design tokens
```
