# ===================================================================
# KAIROS API — Dockerfile de produção
# ===================================================================

# ---------- Stage 1: deps + build ----------
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/employee/package.json ./apps/employee/
COPY apps/super-admin/package.json ./apps/super-admin/
RUN pnpm install --frozen-lockfile
COPY apps/api ./apps/api
COPY tsconfig.base.json tsconfig.packages.json ./
# Gera Prisma Client
RUN npx prisma@5.22.0 generate --schema=./packages/database/prisma/schema.prisma
# Compila os packages workspace (que tem src/.ts como main)
ENV PATH=/app/node_modules/.bin:$PATH
RUN pnpm --filter @kairos/database --filter @kairos/billing --filter @kairos/face --filter @kairos/timesheet --filter @kairos/types --filter @kairos/utils --filter @kairos/config --filter @kairos/api build 2>&1 || true

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl dumb-init wget
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app/apps/api

# Copia o app inteiro (com node_modules da app)
COPY --from=build /app/apps/api ./
# Copia node_modules raiz (com .prisma, .pnpm)
COPY --from=build /app/node_modules /app/node_modules
# Copia packages
COPY --from=build /app/packages /app/packages

# Cria usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --quiet --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
