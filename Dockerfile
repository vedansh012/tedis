# syntax=docker/dockerfile:1
# --------------------------------------------------------------------------
# TedIS production image. Multi-stage → a lean, non-root runtime that ships
# only Next's standalone server + the traced node_modules (incl. Prisma engine,
# sharp, argon2). Debian slim (glibc) is used so those native modules resolve
# their prebuilt binaries without an alpine/musl rebuild.
# --------------------------------------------------------------------------

# ---- deps: install with the native toolchain available as a fallback --------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
# Native postinstall scripts (argon2, sharp, prisma) are allow-listed in package.json.
RUN pnpm install --frozen-lockfile

# ---- builder: prisma generate + next build (standalone) ---------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `pnpm build` == `prisma generate && next build`
RUN pnpm build

# ---- runner: minimal, non-root ---------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

# Standalone server bundles only what's used; static + public are copied beside it.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Container-level liveness (also exposed at /api/health for the platform's probe).
# Uses $PORT so it works on hosts (Railway/Render) that inject a dynamic port.
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrations run as a separate release step (see DEPLOY.md), not on boot.
CMD ["node", "server.js"]
