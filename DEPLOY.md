# TedIS — Deployment Runbook

Production build is a **standalone Next.js server** in a non-root Debian-slim
container ([Dockerfile](Dockerfile)). CI ([.github/workflows/ci.yml](.github/workflows/ci.yml))
gates every push on typecheck · lint · build.

> ⚠️ **Do not run migrations on container boot.** With >1 instance that races.
> Migrations are a **release step** (below), run once per deploy before traffic
> shifts to the new image.

---

## 1. Required environment variables

The app **fails fast on boot** if any of these are missing/invalid (`src/config/env.ts`).

| Var | Example | Notes |
|---|---|---|
| `APP_URL` | `https://tedis.uk` | Canonical URL (OG, sitemap, WebAuthn origin) |
| `DATABASE_URL` | `postgresql://…?connection_limit=10` | **Set `connection_limit`** (see §4) |
| `REDIS_URL` | `rediss://…` | Sessions, rate limits, queues |
| `SESSION_SECRET` | 48 random bytes | `openssl rand -base64 48` |
| `CSRF_SECRET` | 48 random bytes | `openssl rand -base64 48` |
| `WEBAUTHN_RP_ID` | `tedis.uk` | Bare host, no scheme |
| `WEBAUTHN_RP_NAME` | `TedIS` | |
| `WEBAUTHN_ORIGIN` | `https://tedis.uk` | Must match APP_URL |

**Optional (features activate when set):**
- Media → R2/S3: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` (blank = local disk).
- Error tracking: `SENTRY_DSN` (server), `NEXT_PUBLIC_SENTRY_DSN` (client).
- Email: `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM`.

Generate the two secrets:
```bash
openssl rand -base64 48   # SESSION_SECRET
openssl rand -base64 48   # CSRF_SECRET
```

## 2. Build & run (Docker)

```bash
docker build -t tedis:latest .
docker run --rm -p 3000:3000 --env-file .env.production tedis:latest
# liveness:
curl -fsS http://localhost:3000/api/health
```

## 3. Release step — run migrations before shifting traffic

The runtime image is standalone and does **not** carry the Prisma CLI. Run
migrations from a context that has dev deps (CI job, or the builder image):

```bash
pnpm prisma migrate deploy      # applies pending migrations, idempotent
```

- **Railway / Render:** set this as the **release/pre-deploy command**.
- **Fly.io:** `[deploy] release_command = "pnpm prisma migrate deploy"`.
- **Raw Docker:** `docker run --env-file .env.production --entrypoint sh tedis-migrate -c "pnpm prisma migrate deploy"` using an image that includes dev deps, or run it from CI against the prod DB.

## 4. Database — connection pooling (required at scale)

Prisma opens a pool **per instance**; Postgres caps total connections (~100 default).
- Single instance: `?connection_limit=10` is plenty.
- Multiple instances: put **PgBouncer** (transaction mode) in front and point
  `DATABASE_URL` at it; keep `connection_limit` modest per instance.
- Neon/Supabase provide a pooled connection string — use the **pooled** one for
  the app and the **direct** one for `migrate deploy` (add `directUrl` if needed).

## 5. Health, HTTPS, headers

- **Health probe:** `GET /api/health` → `200` when DB **and** Redis are reachable,
  `503` otherwise. Point the platform's health check + your uptime monitor here.
- **HTTPS/CORS:** platform terminates TLS. HSTS + `X-Frame-Options: DENY` +
  nosniff are already sent (`next.config.ts`); tRPC mutations enforce same-site
  Origin + CSRF, so no wildcard CORS is needed.

## 6. Media & CDN

Local disk is **wiped on redeploy** and can't be shared across instances. For any
container platform, set the `S3_*` vars (Cloudflare R2 recommended, zero egress)
and serve `S3_PUBLIC_URL` from a CDN/custom domain. The storage driver switches
automatically — no code change (`src/server/services/media/storage.ts`).

## 7. Admin bootstrap

Create the first Super Admin after the DB is seeded/migrated:
```bash
pnpm tsx scripts/make-admin.ts you@yourdomain.com SUPER_ADMIN
```
`/admin` returns 404 to everyone else.

---

## Pre-deploy checklist

- [ ] All required env vars set in the host (secrets generated fresh, not reused from dev)
- [ ] `DATABASE_URL` has a pooler / `connection_limit`
- [ ] `pnpm prisma migrate deploy` wired as the release command
- [ ] `S3_*` set + CDN in front of `S3_PUBLIC_URL` (container hosts)
- [ ] `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` set (error tracking)
- [ ] Health check points at `/api/health`
- [ ] First Super Admin promoted
- [ ] Automated **DB backups** enabled on the Postgres provider
- [ ] `APP_URL` / `WEBAUTHN_*` match the real domain
