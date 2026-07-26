# TedIS — Project State

> The single source of truth for build progress. Updated at the end of every increment.
> Read this first when resuming work.

**Product:** TedIS — a Universe-based platform for builders, learners, and creators.
**Architecture:** Modular monolith. Next.js 15 (App Router) + tRPC + Prisma + PostgreSQL + Redis.
**Decision log:** see `docs/ARCHITECTURE.md`.

---

## Legend
- ✅ Done & verified (compiles/runs, wired end-to-end)
- 🚧 In progress
- ⏭️ Planned (next increments)
- 🔒 Blocked on external input (secrets, OAuth apps, infra) — see "Needs from founder"

---

## Increment ledger

### Increment 1 — Foundation ✅ (current) — VERIFIED
Verified: `pnpm prisma validate` ✓, `pnpm typecheck` ✓, `pnpm build` ✓ (landing prerenders).
- ✅ Repo scaffold, feature-based folder structure
- ✅ Strict TypeScript (noUncheckedIndexedAccess etc.), ESLint, Prettier, tooling
- ✅ Env validation (`src/config/env.ts`) with Zod — fail-fast on boot, client/server split
- ✅ Prisma + Redis singletons (`src/server/db/*`) with dev hot-reload guards
- ✅ Local infra: `docker-compose.yml` (Postgres 16 + Redis 7, healthchecks)
- ✅ **Complete production database schema** (`prisma/schema.prisma`): identity, auth,
      universes, social graph, projects, communities, posts/feed, messaging, learning,
      notifications, moderation, audit — soft-delete + audit conventions, indexes, FKs,
      citext CI-uniqueness, pg_trgm for search, keyset-pagination indexes
- ✅ Design tokens + Tailwind theme (light/dark, AA contrast, reduced-motion, focus-visible)
- ✅ App shell: root layout (Inter + JetBrains Mono, theme provider), real landing page
- ✅ Security headers (CSP-ready, X-Frame-Options DENY, HSTS, nosniff) in `next.config.ts`

**Deferred (tracked, not forgotten):**
- `experimental.typedRoutes` is OFF until Increment 2 — enabling it now would force fake
  `/login` `/signup` `/explore` pages. Re-enable the flag when those routes land.
- `prisma migrate` not yet run — needs Postgres up (`pnpm infra:up`, requires Docker,
  not installed on this machine). Schema is validated; first migration runs in Increment 2.

### Increment 2 — Authentication core ✅ — VERIFIED
Verified: `pnpm typecheck` ✓, `pnpm build` ✓, `scripts/e2e-auth.ts` → **24/24 pass**
against live Postgres + Redis through the real tRPC caller.
- ✅ Email+password: argon2id (OWASP params), transparent rehash-on-login
- ✅ DB-backed opaque sessions (split id.secret token, sha256 at rest), sliding + absolute
      expiry, server-side revocation, HttpOnly/SameSite/Secure cookies
- ✅ CSRF: double-submit cookie + Origin/Sec-Fetch gate on all mutations (verified rejected)
- ✅ Rate limiting: Redis sliding-window (per-IP + per-account policies)
- ✅ Account lockout after 10 failures (verified: correct password refused while locked)
- ✅ Email verification (single-use hashed tokens) + resend
- ✅ Secure password reset (revokes all sessions, verified)
- ✅ Enumeration-safe register + constant-time login for unknown accounts (verified)
- ✅ Login history (LoginEvent) + device recognition + audit log on privileged actions
- ✅ Session/device management API (list, revoke-with-ownership-check, login history)
- ✅ Auth UI: signup, login (typed outcomes + resend), forgot/reset password, verify-email
      — RHF + Zod, accessible fields, loading/success/error states
- ✅ tRPC stack: context, superjson, CSRF/auth middleware, React Query provider

MFA branch is wired but dormant (mfaEnabled=false) — activated in Increment 3.

### Increment 3 — Auth extensions ⏭️
Google + GitHub OAuth (arctic), Magic Link, Passkeys/WebAuthn (simplewebauthn),
MFA/TOTP (otplib), account lockout, backup codes.

### Increments 4–9, 12, 15 — Functional app spine ✅ — VERIFIED IN BROWSER
Verified: `pnpm typecheck` ✓, `pnpm build` ✓ (16 routes), and a live browser walkthrough —
logged in as demo user → personalized feed → created a post (CSRF mutation, optimistic
re-render) → Explore grid. Local Postgres seeded with 12 Universes, 3 demo users,
3 projects, 6 posts, follows.
- ✅ **Design system + app shell** (Inc 4): base UI kit (Button/Input/Card/Avatar/Badge/
      Skeleton/Textarea/Label), responsive nav (desktop sidebar + mobile bottom bar),
      theme toggle, loading skeletons + empty states everywhere, Framer Motion in onboarding
- ✅ **Onboarding + Universe selection** (Inc 5): 2-step flow, multi-select Universe grid
      with accent animation, username claim, gated redirects (`onboardedAt`)
- ✅ **Profiles + social graph** (Inc 6): profile page (Work/Activity tabs), edit in
      settings, follow/unfollow with counters + notifications, suggested people
- ✅ **Projects** (Inc 7): list, detail (hero/status/tech/links/contributors/respect),
      create form with tech picker, per-user project lists
- ✅ **Home feed + Explore** (Inc 8): Universe-filtered keyset-paginated feed, infinite
      scroll, composer, optimistic Respect/Bookmark; Explore = Universes + trending + people
- ✅ **Universe pages** (Inc 9): header + join/leave + Feed/Projects/People tabs
- ✅ **Notifications** (Inc 12, non-realtime): grouped list, unread badge, mark-all-read
- ✅ **Settings** (Inc 15): profile edit, active sessions (revoke), login history
- ✅ Cursor pagination lib, RSC auth helper, inferred client types, seed script

### Increment 10 — Communities ✅ — VERIFIED IN BROWSER
Verified: created & posted a reply live; join/owner states, counters, pinned threads work.
- ✅ Community service + router: list, detail, create, join/leave (owner-guarded), threads,
      thread detail, createThread (membership-gated), createReply (locked/membership checks)
- ✅ UI: /communities (list + create), /communities/[slug] (header, join/leave, rules,
      thread composer, thread list), /communities/[slug]/[threadId] (thread + replies + composer)
- ✅ Seeded 3 communities with pinned welcome threads + replies

### Increment 11 — Search (keyword/FTS) ✅ — VERIFIED IN BROWSER
Verified: queries resolve across Universes, Communities, Projects, People.
- ✅ Global search service (CI `contains`, pg_trgm-backed) + router + /search page (grouped)
- ✅ Wired into desktop sidebar + mobile top bar
- ⏭️ Semantic/vector search is a later enhancement on top of this.

### Rebrand + frictionless auth ✅ — VERIFIED IN BROWSER
Verified: `typecheck` ✓, `build` ✓, `e2e-auth` → **23/23**, live browser signup (new
account created instantly, auto-logged-in, DB confirmed ACTIVE with a session).
- ✅ **Orange brand**: primary/accent/ring tokens → orange (#FF6A00) across light+dark
- ✅ **Official logo** (`public/tedis-logo.png`) used in: landing nav + hero (floating),
      app sidebar + mobile bar, auth pages, favicon (`app/icon.png` + `apple-icon.png`),
      loading splash (`app/loading.tsx`). `TedisMark` is the single source.
- ✅ **Landing page redesign**: premium orange+white, always-light marketing surface,
      Framer Motion entrance + floating logo, feature cards, gradient CTA band, responsive
- ✅ **Email verification removed entirely**: no verify emails/pages/messages, no login
      gate; deleted `/verify-email`, `verifyEmail`/`resendVerification` procedures+services,
      verification email templates, verify/magic Zod schemas, unused rate-limit policies
- ✅ **Instant signup**: fields = Full name + Username + Email + Password → account created
      + auto-login (session cookie set server-side) → redirect to /home (→ onboarding).
      Unique email/username enforced (CONFLICT on dupes). Password hashing (argon2id),
      CSRF, lockout, password reset all still verified intact.

### Complete post system ✅ — VERIFIED IN BROWSER
Verified: `typecheck` ✓, `build` ✓ (24 routes), real media pipeline (generate → store →
serve → render), gallery + lightbox + post detail + comments in browser, DB integrity
(commentsCount, 3 media rows, /api/media URLs).
- ✅ **DB**: added `Post.sharesCount`, `PostShare` model, `PostMedia.thumbnailUrl/durationSec`
      (migration `post_media_shares`). Posts/media/likes/comments/shares all indexed.
- ✅ **Media upload**: `POST /api/upload` (auth + CSRF + rate-limit gated); `storeUpload`
      validates type/size, re-encodes images via sharp (magic-byte check + EXIF strip +
      resize→webp), writes to `./storage/uploads`. Verified 401 unauth, 413/415 guards.
- ✅ **Media serving**: `/api/media/[name]` route handler — works in dev+prod (unlike
      runtime public/ files), Range support for video seeking, path-traversal blocked (400).
- ✅ **Composer v2**: auto-resizing textarea, "What's on your mind?", image + video buttons,
      drag-and-drop, per-item upload with spinners, previews w/ remove, char counter,
      one-video-or-≤6-images rule, loading state.
- ✅ **Feed rendering**: responsive image gallery (1–6 layouts), native video player
      (play/pause/mute/fullscreen/progress via controls), full-screen lightbox w/ keyboard nav.
- ✅ **Like** = Respect (optimistic, dedup via unique constraint) — existing, kept.
- ✅ **Comments**: add / delete-own / list (keyset), real-time count, notification to author,
      on `/posts/[id]` detail page.
- ✅ **Share**: copy-link + Web Share API, `PostShare` record + `sharesCount` (extensible targets).
- ✅ **Saved**: bookmark → `/saved` page (nav item added).
- ✅ **Security**: upload validation, type/size limits, ownership checks on comment delete.
- Storage is local-FS but behind a storage-agnostic interface → drop-in S3/R2 when you add
  the 🔒 bucket creds, no caller changes.

### UX audit fixes — batch 1 ✅ — VERIFIED IN BROWSER
Verified: `typecheck` ✓, `build` ✓, browser (avatar renders in header + nav, mobile "More"
drawer reaches all destinations, "interests" copy live).
- ✅ **Avatar upload** (Critical): `AvatarUpload` component → reuses /api/upload; wired into
      Settings (persists immediately) + onboarding step 2. Fixed `Avatar` to render
      `/api/media` sources `unoptimized` (they were silently failing).
- ✅ **Mobile navigation** (Critical): added a "More" bottom-nav tab + drawer exposing
      Profile, Search, Projects, Communities, Saved, Settings, theme, logout — previously
      unreachable on mobile.
- ✅ **Universe → Interests rename** (Critical): all user-facing copy across landing,
      onboarding, feed composer, explore, search, communities, notifications, forms now
      says interests/topics. Internal model/route (`Universe`, `/universe/[slug]`) kept to
      avoid breaking links/recommendation logic.
- ✅ **Onboarding polish**: title "What interests you?" + requested subtitle; "0 builders"
      → "New topic"; selection state now uses the **orange brand** (was violet/blue);
      removed redundant username re-entry; added avatar + read-only handle.
- ✅ **Contrast (a11y)**: interactive orange darkened (`#FF6A00`→~`#E85D00`) so white button
      text is more legible.

Deferred from audit (bigger / blocked): social login (needs 🔒 OAuth creds), desktop right
rail, edit/delete own posts, messaging, landing product screenshot, realtime notifications.

### Remaining (not yet built) ⏭️
- Auth extensions: OAuth (needs 🔒 your app creds), Passkeys, MFA/TOTP, Magic Link (Inc 3)
- Realtime messaging (Inc 13) · Learning (Inc 14) · realtime push for notifications
- Semantic search enhancement (Inc 11+)
- DevOps: prod Docker image, CI/CD, Sentry, monitoring (Inc 16)
- Media uploads (needs 🔒 S3/R2 bucket)

---

## Needs from founder (external — I cannot do these for you)
These are 🔒 blockers for the increments that use them. None block Increment 1–2.
- [ ] Google OAuth app → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Increment 3)
- [ ] GitHub OAuth app → `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (Increment 3)
- [ ] Transactional email provider (Resend/Postmark) → `EMAIL_*` (Increment 2)
- [ ] Object storage bucket (S3/R2) → `S3_*` (Increment 7, media)
- [ ] Production Postgres + Redis hosts (Increment 16)
- [ ] Error tracking DSN (Sentry) (Increment 16)

## Conventions (do not violate)
- All mutable domain tables carry `createdAt`, `updatedAt`, and soft-delete `deletedAt`.
- Never hard-delete user content; filter `deletedAt IS NULL` in the service layer.
- All privileged mutations write an `AuditLog` row.
- Service layer (`src/server/services/*`) is framework-agnostic and the ONLY place that
  touches Prisma. tRPC routers and Server Components call services, never Prisma directly.
- Validation lives in `src/features/*/schema.ts` (Zod), shared client+server.
