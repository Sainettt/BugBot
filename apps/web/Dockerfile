# Next.js web. Build context is the repo root (pnpm workspace): docker build -f apps/web/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ── deps: manifests only, so this layer is cached until a package.json changes ──
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/agent-runner/package.json apps/agent-runner/
RUN pnpm install --frozen-lockfile --filter "@bugbot/web..."

# ── build: shared first (web imports its dist), then next build ──
FROM deps AS build
# next.config's rewrites() is evaluated by `next build` and frozen into the routes manifest, so
# the browser-facing /api/* proxy target has to be known here — the container's env var comes
# too late. `api` is the compose service name.
ARG API_INTERNAL_URL=http://api:3001
ENV API_INTERNAL_URL=$API_INTERNAL_URL
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @bugbot/shared build && pnpm --filter @bugbot/web build

# ── runtime: the standalone server Next traced — no pnpm, no source ──
FROM base AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
