# ===================================================================
# KAIROS API — Dockerfile de produção
# Multi-stage: deps → build → runtime
# Non-root, dumb-init, prisma client gerado no build
# ===================================================================

# ---------- Stage 1: deps ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/employee/package.json ./apps/employee/
COPY apps/super-admin/package.json ./apps/super-admin/
RUN pnpm install --frozen-lockfile --filter @kairos/api... --filter @kairos/database

# ---------- Stage 2: build ----------
FROM deps AS build
WORKDIR /app
COPY packages ./packages
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

# Gera Prisma Client (com schema explícito)
WORKDIR /app/packages/database
RUN npx prisma generate --schema=./prisma/schema.prisma
WORKDIR /app

# Build NestJS
RUN pnpm --filter @kairos/api build

# Remove devDependencies pra reduzir tamanho
RUN pnpm deploy --filter @kairos/api --prod /out

# ---------- Stage 3: runtime ----------
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl dumb-init wget
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app

# Copia node_modules de produção + build
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
COPY --from=build /out/package.json ./

# Cria usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --quiet --spider http://localhost:3001/api/health || exit 1

# dumb-init pra sinais corretos
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
