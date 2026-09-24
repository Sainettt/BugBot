# Agent runner. Build context is the repo root (pnpm workspace): docker build -f apps/agent-runner/Dockerfile .
# Debian slim (not alpine) because Claude Code and git are happier with glibc.
FROM node:22-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

# ── deps: manifests only, so this layer is cached until a package.json changes ──
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/agent-runner/package.json apps/agent-runner/
RUN pnpm install --frozen-lockfile --filter "@bugbot/agent-runner..."

# ── build: shared → runner ──
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/agent-runner apps/agent-runner
RUN pnpm --filter @bugbot/shared build && pnpm --filter @bugbot/agent-runner build

# ── runtime: git + Claude Code CLI pinned to an exact version (bumped deliberately, never latest) ──
FROM node:22-bookworm-slim AS runtime
ARG CLAUDE_CODE_VERSION=2.1.281
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
 && mkdir -p /workspaces /attachments \
 && chown node:node /workspaces /attachments
ENV NODE_ENV=production RUNNER_PORT=3102 WORKSPACES_DIR=/workspaces
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/agent-runner/node_modules ./apps/agent-runner/node_modules
COPY --from=build /app/apps/agent-runner/package.json ./apps/agent-runner/package.json
COPY --from=build /app/apps/agent-runner/dist ./apps/agent-runner/dist
# The analysed clones and the read-only attachment mount (plan 03). The subscription token
# (CLAUDE_CODE_OAUTH_TOKEN) comes from the environment at run time — never baked into the image.
VOLUME ["/workspaces", "/attachments"]
USER node
EXPOSE 3102
CMD ["node", "apps/agent-runner/dist/main.js"]
