# ===================================================================
# KAIROS EMPLOYEE (PWA) — Dockerfile de produção
# Next.js standalone output, non-root, com SW
# ===================================================================

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# ---------- Stage 1: deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/
COPY apps/employee/package.json ./apps/employee/
COPY apps/super-admin/package.json ./apps/super-admin/
RUN pnpm install --frozen-lockfile

# ---------- Stage 2: build ----------
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages ./packages
COPY apps/employee ./apps/employee
COPY tsconfig.base.json ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV PATH=/app/node_modules/.bin:$PATH
RUN cd /app/apps/employee && pnpm exec next build

# ---------- Stage 3: runtime ----------
FROM node:20-alpine AS runtime
RUN apk add --no-cache dumb-init wget
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone build output
COPY --from=build --chown=nextjs:nodejs /app/apps/employee/.next/standalone /app
COPY --from=build --chown=nextjs:nodejs /app/apps/employee/.next/static /app/apps/employee/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/employee/public /app/apps/employee/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --spider http://localhost:3000/manifest.json || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "node apps/employee/server.js"]
