# NestJS API. Build context is the repo root (pnpm workspace): docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS base
RUN apk add --no-cache openssl && corepack enable
WORKDIR /app

# ── deps: manifests only, so this layer is cached until a package.json changes ──
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/agent-runner/package.json apps/agent-runner/
# The api's postinstall runs `prisma generate`, which needs the schema — copy it first.
COPY apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma
RUN pnpm install --frozen-lockfile --filter "@bugbot/api..."

# ── build: shared → prisma client → nest build ──
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @bugbot/shared build \
 && pnpm --filter @bugbot/api run prisma:generate \
 && pnpm --filter @bugbot/api build

# ── runtime: compiled output + node_modules, no source ──
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 3001
# Every start: apply migrations, then serve. Owners are JIT-created from ADMIN_EMAILS on sign-in.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
