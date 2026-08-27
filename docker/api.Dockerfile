# ===================================================================
# KAIROS API — Dockerfile de produção
# Multi-stage: deps → build → runtime
# Non-root, dumb-init, prisma client gerado no build
# ===================================================================

# ---------- Stage 1: deps ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
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
RUN npx prisma@5.22.0 generate --schema=./packages/database/prisma/schema.prisma
# Garante que o .prisma esteja em /app/node_modules/.prisma (local usado pelo @prisma/client)
RUN mkdir -p /app/node_modules/.prisma && cp -r /app/packages/database/node_modules/.prisma/* /app/node_modules/.prisma/ 2>/dev/null || true
# Mostra onde o .prisma foi gerado para debug
RUN find /app -name ".prisma" -type d 2>/dev/null | head -5

# Build NestJS
RUN pnpm --filter @kairos/api build

# Remove devDependencies pra reduzir tamanho
RUN pnpm deploy --filter @kairos/api --prod /out
# Regenera o Prisma Client DENTRO do /out (o pnpm deploy nao inclui o .prisma)
WORKDIR /out
RUN /out/node_modules/.bin/prisma generate --schema=/app/packages/database/prisma/schema.prisma || true
WORKDIR /app

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
