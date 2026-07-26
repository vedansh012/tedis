<!-- AI MEMORY FILE. Not human docs. Concise, no duplication. Update after every major feature; replace outdated bullets; keep Recent Changes to last 10; keep <1500 lines. Human build ledger = PROJECT_STATE.md (separate). -->

# Project
- **Purpose**: Interest-first "build in public" social platform. People post updates, group them into Projects (a project = a timeline of related posts), follow topics + people, DM, discuss.
- **Vision**: Reach comes from topic relevance + discussion quality, NOT follower clout. Feed is follower-blind.
- **Target users**: students, developers, designers, researchers, builders/creators.
- **Stage**: Feature-complete prototype. Pre-first-deploy. All code done + verified; blockers are provisioning + legal (human actions), not code.

# Architecture
- **Stack**: Next.js 15 (App Router) · React 19 · tRPC v11 (+ React Query + superjson) · Prisma · PostgreSQL · Redis (ioredis) · Tailwind · argon2 · sharp · vitest.
- **Folder structure**:
  - `src/app` — routes. Groups: `(app)`=authed shell (feed/profiles/projects/messages/settings/etc.), `(auth)`=login/signup/reset, `admin/`=RBAC-gated panel, `api/`=route handlers (`upload`, `media/[name]`, `realtime` SSE, `health`, `trpc`). Also `robots.ts`, `sitemap.ts`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `layout.tsx`, `(app)/template.tsx` (page transition).
  - `src/server` — `services/*`=ONLY place that touches Prisma (framework-agnostic); `trpc/`=routers + context + `trpc.ts` (procedures/middleware) + `root.ts`; `db/`=prisma+redis singletons; `auth/`=session, current-user, require-admin; `lib/logger.ts`.
  - `src/features/*` — per-feature Zod `schema.ts` + `constants.ts` (shared client+server): `auth`, `feed` (git-repo.ts), `media`, `moderation`, `admin` (roles.ts).
  - `src/components` (ui/ kit, feed/, profile/, admin via app), `src/lib` (pagination, slug, crypto, utils, trpc client, observability), `src/hooks`, `src/styles/globals.css`.
- **Database**: Postgres via Prisma (`prisma/schema.prisma`). Keyset pagination, denormalized counters, soft-delete (`deletedAt`), citext unique, pg_trgm GIN indexes for search. Migrations in `prisma/migrations/`.
- **Authentication**: email+password (argon2id, OWASP params). DB-backed opaque sessions (split id.secret token, sha256 at rest, sliding+absolute expiry, server revocation). CSRF double-submit cookie + Origin/Sec-Fetch gate on all mutations. Account lockout. RBAC via `UserRole` enum (USER/SUPPORT/MODERATOR/ADMIN/SUPER_ADMIN). Email verification REMOVED (instant signup). Password reset exists (needs email provider to actually send).
- **Storage**: env-gated driver in `services/media/storage.ts` — local FS (`./storage/uploads`, dev/fallback) OR S3/R2 (when `S3_*` set). Images re-encoded via sharp (magic-byte validate + EXIF strip → webp). Served: `/api/media/[name]` (local) or CDN public URL (R2). Upload `/api/upload` buffers in memory (4.5MB cap issue on serverless).
- **Realtime**: SSE stream `/api/realtime` + Redis pub/sub fan-out (per-user channel) + presence keys (TTL 90s). NOT WebSockets (fits standalone deploy, no sticky sessions). Send=tRPC mutation; receive=SSE.
- **Deployment architecture**: `next.config output:"standalone"` → multi-stage non-root Dockerfile → container host (Railway). Managed Postgres (Neon) + Redis (Upstash) + media (Cloudflare R2). CI = GitHub Actions (typecheck·lint·test·build). Migrations run as release step, not on boot.

# Features
Format: Status · files · APIs (tRPC unless noted) · tables.

- **Auth** — Complete · `services/auth/*`, `routers/auth.ts`, `(auth)/*` pages · `auth.*` · users, password_credentials, sessions, login_events, verification_tokens.
- **Feed** — Complete · `services/feed/feed.service.ts`, `routers/feed.ts`, `(app)/home` · `feed.home/interest/byUser/post/saved/createPost/toggleReaction/toggleBookmark/share` · posts, post_media, reactions, bookmarks, post_shares. "For You" excludes own posts + blocked users (both directions); keyset pagination; follower-blind.
- **Comments** — Complete · `services/comment`, `routers/comment.ts` · comment.* · comments.
- **Posts UI** — Complete · `components/feed/*` (post-card, post-media, post-menu, composer, lightbox, share-button, comment-section). Like/save "pop" animation, image fade-in, kebab menu (copy link/report).
- **Projects** — Complete · `services/project/project.service.ts`, `routers/project.ts`, `(app)/projects/[slug]`, `components/project/project-card.tsx` · `project.list/trending/byUser/mine/bySlug/timeline/create` · projects (+media/technologies/contributors/versions/links). A project = chronological timeline of attached posts (dated, connected, "Where it started"/"Latest"). Owner can compose in-project (locked Composer). NO progress bars / mgmt-tool visuals (intentionally removed).
- **Git repo attach** — Complete · `features/feed/git-repo.ts` (parse/validate GitHub/GitLab/Bitbucket HTTPS) · `Post.gitRepoUrl`. Card on post + composer field. Unit-tested.
- **Interests** — Complete. Renamed from "Universe" in code; DB tables still `@@map("universes")`/`user_universes` (no data migration). `routers/interest.ts`, `services/interest`, `(app)/interest/[slug]`.
- **Profiles + Follow** — Complete · `services/profile/profile.service.ts`, `routers/profile.ts`, `(app)/u/[username]`, `components/profile/*` (follow-button, profile-actions, message-button) · `profile.byUsername/follow/unfollow/suggested/following/deleteAccount` · follows. Follower count framed as "builders follow their work in [interests]". Profile tabs: Projects/Posts/Following.
- **Search** — Complete · `services/search`, `routers/search.ts`, `(app)/search` · `search.global` · trigram GIN indexes on posts.body/users.displayName/projects.name+tagline. Debounced client, rate-limited server. Groups: interests/people/posts/projects/communities.
- **Notifications** — Complete (POLLING, not SSE) · `routers/notification.ts`, `(app)/notifications` · 60s poll unreadCount.
- **Messaging / DM** — Complete · `services/messaging/{messaging.service,realtime}.ts`, `routers/message.ts`, `api/realtime/route.ts`, `(app)/messages`, `hooks/use-chat-stream.ts` · `message.conversations/conversation/openDirect/history/send/markRead/typing` · conversations, conversation_participants, messages, message_attachments, message_reactions. Optimistic send, typing, presence dots, read receipts (lastReadAt cursor), block-aware. Realtime = SSE+Redis.
- **Trust & Safety** — Complete · `services/moderation/moderation.service.ts`, `routers/moderation.ts`, `components/moderation/report-dialog.tsx` · `moderation.report/block/unblock/isBlocked` · reports, blocks. Report posts/comments/projects/users; block hides content both ways + auto-unfollow. Feeds into admin queue.
- **Admin panel** — Complete · RBAC-gated `src/app/admin/*` (layout via `requireAdmin`→notFound), `services/admin/admin.service.ts`, `routers/admin.ts` · `admin.metrics/activity/recentActivity/users/setUserStatus/setUserRole/reports/resolveReport/auditLogs` · reports, audit_logs. Pages: Dashboard (KPI cards + 14-day activity bar-charts + recent signups/posts feed + health strip), Users (search/suspend/ban/role), Reports (resolve/dismiss), Logs (audit). `setUserRole` restricted to SUPER_ADMIN.
- **Account deletion (GDPR)** — Complete · `profile.deleteAccount` + Settings "Danger zone". Password-confirmed; revokes sessions, deletes credentials, scrubs profile PII, anonymizes email/username, soft-deletes.
- **Ops/observability** — Complete · `api/health` (DB+Redis probe→200/503), `error/global-error/not-found.tsx`, `server/lib/logger.ts`, Sentry (`instrumentation.ts`, `instrumentation-client.ts`, `lib/observability.ts` — env-gated), `robots.ts`/`sitemap.ts`/OG+Twitter metadata in `app/layout.tsx`.
- **Media uploads** — Complete · `api/upload/route.ts` (auth+CSRF+rate-limit+size guard), `services/media/storage.ts` (local + R2 via `@aws-sdk/client-s3`).
- **Motion/UX** — Complete · `tailwind.config` tokens (`ease-premium`, `pop`, `fade-in`), `.stagger` util, reduced-motion guard, page-transition template, theme View-Transition radial reveal (`theme-toggle.tsx`).
- **Tests** — Harness complete · vitest (`vitest.config.ts`, `*.test.ts` for git-repo + pagination = 21 tests) + integration scripts in `scripts/` (e2e-auth, verify-moderation, verify-messaging).

# Design Decisions
- **SSE + Redis pub/sub** over WebSockets/Socket.io → fits Next standalone single-process, no sticky sessions, scales across instances. (Vercel serverless breaks this.)
- **Interest rename**: code renamed Universe→Interest; kept DB `@@map("universes")` to avoid a data migration.
- **Follower-blind feed**: no follower-count ranking; motivation via connection, reach via topic+quality.
- **Read receipts** via `ConversationParticipant.lastReadAt` cursor (O(1)), not per-message rows.
- **One DM per pair** via unique `Conversation.directKey` (sorted user ids), upsert race-safe.
- **Rate limiting**: fixed-window (INCR+EXPIRE, ~1 Redis cmd) on hot paths (every mutation + search); precise sliding-window kept for auth. Both fail-open on Redis error.
- **Presence**: 90s TTL Redis key, refreshed ~every 50s by SSE (keepalive ping decoupled at 25s) to conserve free Redis commands.
- **Admin cloaking**: non-staff get 404 (`notFound()`), never 403 — panel existence hidden.
- **Media R2 env-gated** with local FS fallback (non-breaking before creds set).
- **Presigned uploads NOT done** — uploads proxy through app (blocks Vercel due to 4.5MB body cap).

# Current State
- Everything in Features works. `pnpm typecheck` ✅, `pnpm lint` ✅ (0 warnings), `pnpm build` ✅ (standalone boots, serves /api/health), `pnpm test` ✅ 21/21.
- Integration scripts pass: e2e-auth 23/23, verify-moderation 8/8, verify-messaging 10/10 (incl. Redis realtime delivery). Account-deletion verified.
- Admin gate verified (no content leak to unauth). Runs locally at http://localhost:3000 with `pnpm dev` (Postgres+Redis via `pnpm infra:up`). Seed: `ada@tedis.dev / Password123!` (ada/grace/linus).

# Current Problems
- Email: Resend wired (`services/email/email.ts`, fetch-based) but inert until `RESEND_API_KEY` + `EMAIL_PROVIDER=resend` set → password reset currently logs to console.
- Legal pages (ToS/Privacy/Cookie) missing — launch blocker for public.
- No product analytics (PostHog/Clarity) — only internal admin metrics.
- Images served `unoptimized` (need CDN derivatives).
- SSE = 1 Redis subscriber connection per client → ceiling ~low-thousands/instance; free Upstash tier command/connection limits are the real prototype ceiling.
- Dormant deps: `arctic`, `otplib`, `@simplewebauthn/*`, `bullmq` (0 imports; tied to planned OAuth/MFA/queues).
- `Post.score` column exists but feed is chronological (ranker not built).
- Notifications poll (60s), not realtime SSE.
- No CSP header (other security headers present).
- **Vercel-incompatible**: SSE realtime + 4.5MB serverless upload cap → use a container host.
- Dev-only: session cookie drops on server restart (prod unaffected).

# Recent Changes
1. Account deletion (GDPR erasure) — profile.deleteAccount + Settings danger zone.
2. Admin activity panel — 14-day charts (users/posts/comments) + recent signups/posts feed.
3. Redis-cost optimization — fixed-window rate limiter on hot paths; presence refresh 15s→~50s (90s TTL).
4. Test harness — vitest + 21 unit tests (git-repo, pagination); wired into CI.
5. Messaging/DM — SSE+Redis realtime, optimistic send, typing/presence/receipts, block-aware; `/messages` UI + profile Message button + nav.
6. Trust & safety — reports (Report model) + user blocking (Block model); feed filtering; report dialog + profile/post menus.
7. Ops hardening — health check, error/404 pages, logger, Sentry wiring, robots/sitemap/OG.
8. Deploy prep — standalone Dockerfile + `.dockerignore` + GitHub Actions CI + DEPLOY.md.
9. Media R2/S3 driver behind storage interface (env-gated, local fallback).
10. Motion polish + premium theme View-Transition radial reveal.

# Deployment
- **Host**: Railway (deploys the Dockerfile). Free `*.up.railway.app` subdomain fine for prototype.
- **Postgres**: Neon (prototype: direct URL + `?connection_limit=5`; at scale: pooled URL + PgBouncer).
- **Redis**: Upstash.
- **Media**: Cloudflare R2 (zero egress) — set `S3_*` + serve `S3_PUBLIC_URL` via CDN.
- **Required env**: `APP_URL, DATABASE_URL, REDIS_URL, SESSION_SECRET, CSRF_SECRET, WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME, WEBAUTHN_ORIGIN`.
- **Optional env**: `S3_ENDPOINT/S3_REGION/S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/S3_PUBLIC_URL`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `EMAIL_PROVIDER/RESEND_API_KEY/EMAIL_FROM`.
- **Secrets**: `openssl rand -base64 48` for SESSION_SECRET + CSRF_SECRET.
- **Release command**: `pnpm prisma migrate deploy`. **Bootstrap admin**: `pnpm tsx scripts/make-admin.ts <email> SUPER_ADMIN`.
- Full runbook + pre-deploy checklist in `DEPLOY.md`. Cost at prototype scale ~$0–5/mo.

# Roadmap
Immediate (next tasks):
1. Provision accounts (Neon/Upstash/R2/Railway) + set env + deploy.
2. Wire Resend email (activate password reset) — set env; code already supports it.
3. Legal pages (ToS/Privacy/Cookie) + GDPR data-export endpoint (pairs with account deletion).
4. Wire PostHog (retention/funnels) — needs project key.

# Important Files
- `prisma/schema.prisma` — full DB schema (all models).
- `src/server/trpc/trpc.ts` — procedures + auth/CSRF/rate-limit/admin middleware.
- `src/server/trpc/root.ts` — router registry.
- `src/server/services/*/*.service.ts` — business logic (only Prisma callers).
- `src/server/services/messaging/realtime.ts` + `src/app/api/realtime/route.ts` — SSE/Redis realtime.
- `src/server/services/media/storage.ts` — media driver (local/R2).
- `src/server/auth/require-admin.ts` + `src/features/admin/roles.ts` — RBAC.
- `src/config/env.ts` — Zod env validation (fail-fast on boot).
- `Dockerfile`, `DEPLOY.md`, `.github/workflows/ci.yml` — deploy.
- `scripts/` — `make-admin.ts`, `e2e-auth.ts`, `verify-moderation.ts`, `verify-messaging.ts`, `seed.ts`, `load/` (k6/locust).
- `PROJECT_STATE.md` — human build ledger (separate from this file).

# Commands
- `pnpm dev` · `pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm test`
- `pnpm infra:up` / `infra:down` (local Postgres+Redis via docker-compose)
- `pnpm prisma migrate deploy` (apply migrations) · `pnpm db:seed`
- `pnpm tsx scripts/make-admin.ts <email> SUPER_ADMIN`

# Recovery Prompt
TedIS is an interest-first "build in public" social platform (like a calmer Reddit/Threads for builders): users post updates, optionally group them into Projects (a project = a chronological timeline of related posts), follow topics + people, DM in realtime, and discuss. Core principle: reach comes from topic relevance + quality, not follower clout (feed is follower-blind).

Stack: Next.js 15 App Router + React 19 + tRPC v11 + Prisma + PostgreSQL + Redis (ioredis) + Tailwind. Service layer (`src/server/services/*`) is the ONLY Prisma caller; tRPC routers call services; validation in `src/features/*/schema.ts`. Auth = argon2id + DB opaque sessions + CSRF + RBAC (`UserRole`). Realtime (DM/presence/typing) = SSE (`/api/realtime`) + Redis pub/sub, NOT WebSockets. Media = env-gated local-FS-or-R2 driver. Deploy = standalone Docker on a container host (Railway) — NOT Vercel (SSE + 4.5MB upload cap break it).

Built + verified: auth, feed, posts/comments/reactions/bookmarks/shares, projects+timeline, git-repo attach, interests (renamed from Universe; DB tables still `@@map("universes")`), profiles+follow, search (trigram), messaging, reports+blocking, admin panel (RBAC 404-gated, dashboard+activity), account deletion (GDPR), health/error/logger/Sentry/SEO, tests. typecheck/lint/build/test all green.

Not done (blockers = mostly human): activate Resend email (env only), legal pages, product analytics, provision infra + deploy. Local: `pnpm infra:up && pnpm dev`; seed login `ada@tedis.dev / Password123!`. Always update this file (`PROJECT_MEMORY.md`) after major features.
