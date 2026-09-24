# Plan 01 — Foundation: monorepo, DB, owner sign-in, app shells

Status: **in progress** (proposed 2026-09-22; slices 1–2 — scaffold, Docker, shared, api with schema, migrations, seed, auth, admin read endpoints, 26 integration tests — done 2026-09-24; slice 3 next) · executes first; plan 02 (project + handoff + forms) builds on it. Executed in three slices with a commit each: (1) scaffold + Docker + shared → (2) api + Prisma + auth + admin endpoints + tests → (3) web + runner stub + CI.
Goal: a running skeleton — Postgres in Docker, NestJS API with the full Prisma schema from [02-entities.md](../02-entities.md) and the owner's Google sign-in, Next.js cabinet shell with EN/PL i18n, a stub agent-runner package, a shared contracts package, tests wired — and one end-to-end proof: the owner signs in and sees the cabinet's dashboard tiles and (demo) feed rendered from real DB rows.

## Decisions baked in

From [04-decisions.md](../04-decisions.md): pnpm monorepo · Prisma + cuid + MAGSpace conventions · one schema with `projectId` · `Job` table queue with a partial unique index · owner sign-in = Google + `ADMIN_EMAILS` · DB-backed `OwnerSession` / `ProjectSession` · docs EN, cabinet EN + PL · nothing from a connected project's secrets in the DB.

## My calls (not asked — revisable)

| Call | Why |
|---|---|
| Package scope **`@bugbot/*`** now, even though the folder is still `MAGGuaranteeBugBot` | The rename is decided (PLAN.md §13); renaming packages later touches every import. Folder rename is a `git mv` whenever convenient. |
| Ports **web 3000 · api 3001 · postgres 5432** (standard) | Everything runs in Docker behind Caddy, which routes by host name; container ports never collide. For a local run next to MAGSpace / MAGGuarantee the host-side ports are env variables (`WEB_HOST_PORT`, `API_HOST_PORT`, `POSTGRES_HOST_PORT`) — override in `.env`, nothing in code changes. (User decision 2026-09-22.) |
| Owner auth = **server-side redirect flow** (`/auth/google` → `/auth/google/callback`) with `google-auth-library`, exactly as MAGSpace plan 02 | Proven in this environment; the client secret never reaches the browser; two endpoints, no passport. |
| **Relay design system** is the visual source (user, 2026-09-22): tokens, `rl-*` component CSS and page mockups committed at `design/relay/`, mapping in [05-design-ui.md](../05-design-ui.md) | The mockups are for this exact product shape (public form, reports + drawer, ideas feed, config); the `rl-*` class names are kept verbatim so a re-sync is a diff, not a rewrite. |
| A **new Google Cloud project** with its own OAuth client (user decision 2026-09-22) | Own consent screen, own redirect URIs, no coupling to MAGSpace's client lifecycle. |
| `SEED_DEMO` seeds a fake `demo` project with two reports | The feed and the tiles need rows to be built against in plans 02–04; the demo project has no working handoff keys and is never seeded in production. |
| Runner is a **stub** in this plan (package, `GET /health`, Dockerfile with git + pinned Claude Code CLI) | Completes the monorepo shape and the image build; analysis logic is plan 03. |

## 1. Repo scaffold

- `pnpm-workspace.yaml`: `apps/*`, `packages/*`. `packageManager: pnpm@9.15.9`, Node ≥ 22 (corepack).
- Root `package.json` scripts: `dev` (shared build, then shared watch + apps in parallel), `build`, `lint`, `test`, `format`, `db:migrate`, `db:seed`, `db:resetdb`.
- `tsconfig.base.json` (strict) extended by every package; ESLint flat config + Prettier at root; `.editorconfig`; `.gitignore` with `.env`, `.data/`, `dist/`, `.next/`.
- `.env.example` (see §2). `.claude/launch.json`: `{ name: "bugbot", runtimeExecutable: "pnpm", runtimeArgs: ["dev"], port: 3100 }`.
- Windows dev note (same as MAGSpace): Docker Desktop for Postgres, pnpm via corepack, Prisma works natively.

## 2. Infrastructure & env

- `docker-compose.yml`: `postgres:16-alpine`, container `bugbot-postgres`, bind mount `${POSTGRES_DATA}`, `127.0.0.1:${POSTGRES_HOST_PORT:-5433}:5432`, healthcheck, the same `x-logging` cap as MAGSpace. `api`, `web`, `agent-runner` services come with the deployment plan; this file starts with Postgres only.
- `.env.example`:

| Variable | Default (dev) | Notes |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `bugbot` | Compose refuses to start without them. |
| `POSTGRES_DATA` | `./.data/postgres` | |
| `POSTGRES_HOST_PORT` | `5433` | |
| `DATABASE_URL` | `postgresql://bugbot:bugbot@localhost:5433/bugbot?schema=public` | Host side; containers get `postgres:5432` later. |
| `API_PORT` | `3101` | |
| `WEB_URL` | `http://localhost:3100` | Cookie/Origin checks and OAuth redirects. |
| `API_INTERNAL_URL` | `http://localhost:3101` | SSR fetches and the `/api/*` rewrite. |
| `SESSION_SECRET` | `''` | Signs the OAuth `state` cookie and the `lang` cookie; **required in production**. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `''` | Required in production; dev boots without them (sign-in refuses). |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3101/auth/google/callback` | Must match the Google Cloud console exactly. |
| `ADMIN_EMAILS` | `danyilfiut@gmail.com` | Comma-separated allowlist; lower-cased on read. |
| `AUTH_DEV_USER` | `danyilfiut@gmail.com` | Dev escape hatch (§4.3). Boot **fails** if set with `NODE_ENV=production`. |
| `SEED_DEMO` | `true` | Demo project + reports in the seed; `false` in production. |
| `STORAGE_DIR` | `./.data/storage` | Attachment root (plan 02 uses it; declared now so the runner mount is known). |
| reserved | | `CLAUDE_CODE_OAUTH_TOKEN` (provider auth = subscription token from `claude setup-token`, decision 2026-09-24; `ANTHROPIC_API_KEY` is the later switch to pay-as-you-go and takes precedence — never set both), `RUNNER_URL`, `RUNNER_TOKEN`, `MAIL_*` — declared as comments, used by plans 03–04. |

## 3. packages/shared — `@bugbot/shared`

Single source of truth for cross-app contracts. Built to `dist/` like `@magspace/shared`.

- `enums.ts` — every Prisma enum as a `const` object + union type (`ProjectStatus`, `ReportKind`, `AnalysisStatus`, `TriageStatus`, `JobStatus`, `RunStatus`, …). **Kept in sync with `schema.prisma` by hand**, one comment at the top of each file pointing at the other.
- `config/` — zod schemas for the `Project` JSON columns, one file each: `auth-config.ts` (discriminated by `authAdapter`; `handoff-jwt` variant: `issuer`, `publicKeys[{kid, pem, notBefore?}]`, `reporterRoles`, `adminRoles`, `adminSubs`, `adminEmails`, `sessionTtlMin`), `form-config.ts` (`FieldDef`, `bug.fields`, `idea.fields`, `dictionaries`), `notification-config.ts`, `limits.ts` (with the defaults of decision 2026-09-22), `provider-config.ts` (`claude-code` variant, initially `{ acceptsImages?: boolean }`).
- `api/` — response types the web renders: `AuthMe`, `AdminDashboard`, `ReportListItem`, `ProjectListItem`.
- Result JSON schemas, the provider interface and the handoff-token contract are **plan 03 / 02** — folders reserved (`result/`, `provider/`, `handoff/`) with a README line each, no code.

## 4. apps/api — `@bugbot/api` (NestJS)

### 4.1 Skeleton
- Nest 10, strict TS, `dotenv -e ../../.env` in scripts (root `.env`), `ConfigModule` with a zod-validated `env.validation.ts` (fail fast; `AUTH_DEV_USER` refused in production; `SESSION_SECRET` / Google vars required in production).
- Global `PrismaModule` + `PrismaService` (shutdown hooks). Global `ValidationPipe` (whitelist, transform, `forbidNonWhitelisted`). `cookie-parser`. Swagger at `/docs` in dev only.
- `GET /health` → `{ ok, db }` (`SELECT 1`). Public.

### 4.2 Prisma schema v1 + migrations
- `apps/api/prisma/schema.prisma` = the draft in [02-entities.md §7](../02-entities.md), verbatim, with the `///` comments.
- Migration `init` via `prisma migrate dev --name init --create-only` then applied; migration `add_integrity_rules` hand-written (`--create-only`, edit the SQL):

```sql
CREATE UNIQUE INDEX "Job_one_running_per_project" ON "Job" ("projectId") WHERE status = 'RUNNING';
ALTER TABLE "Job"          ADD CONSTRAINT "Job_attempt_le_max"        CHECK (attempt <= "maxAttempts");
ALTER TABLE "Report"       ADD CONSTRAINT "Report_number_positive"    CHECK (number > 0);
ALTER TABLE "HistoryEvent" ADD CONSTRAINT "HistoryEvent_one_actor"    CHECK (NOT ("actorUserId" IS NOT NULL AND "actorProjectUserId" IS NOT NULL));
```

- Seed (`prisma/seed.ts`): stable layer always — `AppSetting` rows `maxConcurrentRuns = 1`, `logRetentionDays = 90`, `mailFrom = "bugbot@magtrans.eu"`, `defaultTimezone = "Europe/Warsaw"` (upsert). Under `SEED_DEMO`: project `demo` (`codePrefix DEMO`, `repoUrl` pointing at this repo, placeholder `authConfig` with a throw-away public key, default limits, a minimal `formConfig`, `notificationConfig` to `ADMIN_EMAILS`), one `PromptVersion` v1 activated, one `ProjectUser`, three `Report`s (`DEMO-1` BUG `NEW/NOT_SENT` with no job — the "Send to Claude" state of decision 2026-09-24, plus its `REPORT_RECEIVED` notification row; `DEMO-2` IDEA `SEEN/DONE` with a `DONE` job, a `DONE` `AgentRun` carrying a hand-written valid-looking `resultJson`/`resultMd`, and `currentRunId` set; `DEMO-3` BUG `NEW/QUEUED` with a `QUEUED` job so the queue badge has a row). No real people, no real keys.

### 4.3 Owner auth module (`src/auth`)
Mirrors MAGSpace plan 02, adjusted to the allowlist-in-env decision.

1. `GET /auth/google` — random `state` in a 10-minute signed httpOnly cookie → redirect to Google (`openid email profile`).
2. `GET /auth/google/callback` — verify `state`, exchange `code`, `OAuth2Client.verifyIdToken` (issuer, audience, expiry), require `email_verified`. Lower-cased email ∈ `ADMIN_EMAILS` → **JIT upsert `User`** (create on first login; an existing `isActive = false` row → refused). Not in the list → redirect `WEB_URL/login?error=not_allowed`, nothing created. Success → new `OwnerSession` (fresh id), cookie **`osid`** (httpOnly, `Secure` in prod, `SameSite=Lax`, path `/`, 8 h sliding), `lastLoginAt`, `HistoryEvent OWNER_LOGIN`, redirect `WEB_URL/admin`.
3. `GET /auth/me` → `{ id, email, name, role }` · `POST /auth/logout` → delete the session row, clear the cookie.
4. Guards: one global `AuthGuard` (`APP_GUARD`) that dispatches on a route decorator `@Auth(kind)`: `OWNER` (default for every route), `PUBLIC`, and `PROJECT` (reserved — plan 02 implements the `psid` cookie / `ProjectSession` branch; in this plan it throws `NotImplemented`). Two cookies (`osid`, `psid`) and two tables keep the two worlds apart by construction.
5. `AUTH_DEV_USER`: when set and `NODE_ENV !== 'production'`, the `OWNER` branch resolves that email as the user (JIT-created if missing) without a cookie. Refused at boot in production.
6. Origin-check middleware on `POST/PATCH/PUT/DELETE` (`Origin`/`Referer` must match `WEB_URL`). `@nestjs/throttler` on `/auth/*`. Daily cron (`@nestjs/schedule`) deleting expired `OwnerSession` / `ProjectSession` / `UsedHandoffToken` rows — the housekeeping job of 02-entities §4.16 starts here; log purging joins it in plan 03.

### 4.4 First real endpoints (`src/admin`)
- `GET /admin/dashboard?period=24h|7d|all` → `{ reports, reportsPrev, analysed, needsHuman, failed, failedTopError, tokens, costUsd, queued, running, newBugs, newIdeas }` counted from `Report`, `Job`, `AgentRun` — the four Relay tiles, the top-bar badge and the nav counts.
- `GET /admin/reports?project=&kind=&status=&period=&q=&limit=&cursor=` → feed rows (`ReportListItem`: code, kind, title, project name, reporter name/role, `analysisStatus`, derived `needsHuman`, severity from the current run, `triageStatus`, `createdAt`, `currentRun.{tokens, costUsd, durationMs}`), newest first, cursor-paginated on `(createdAt, id)`.
- `GET /admin/reports/:id` → the report card: fields snapshot, attachments, current run (`resultJson`, `resultMd`, usage), notifications, run history.
- `GET /admin/projects` → `ProjectListItem[]` (slug, name, codePrefix, status, model, counts of reports / queued / running); `GET /admin/projects/:slug` → the config without secret names' values (there are none — only env names).
- `GET /admin/runs?project=&status=&model=&period=&limit=&cursor=` → `AgentRun` rows for the Runs page.
- `GET /admin/settings` → the `AppSetting` rows. Writes to settings and projects are plan 02.
- Every handler is `OWNER`-guarded by default; `HistoryEvent` writing helper (`HistoryService.record(groupId, actor, op, entity, payload)`) lands here and is used by the login flow.

### 4.5 Tests
- jest + ts-jest + supertest booting the real `AppModule`, `--runInBand`. Tests run against the Postgres **schema `bugbot_test`** in the dev database (MAGSpace decision 2026-08-03): `globalSetup` sets `DATABASE_URL` with `?schema=bugbot_test` and runs `prisma migrate deploy`; each file truncates tables between tests.
- Baseline suite: `/health` ok · unauthenticated `/admin/dashboard` → 401 · with `AUTH_DEV_USER` → counts match seeded rows · `/auth/google/callback` with a bad `state` → 400 · a `Job` insert violating `Job_one_running_per_project` throws (proves the raw migration is applied).

## 5. apps/web — `@bugbot/web` (Next.js 15, App Router, Tailwind)

- `create-next-app` (TS, Tailwind, `src/`), React 19. `next.config` rewrites `/api/:path*` → `${API_INTERNAL_URL}/:path*` so cookies are same-origin.
- **Design tokens and component CSS from Relay** ([05-design-ui.md](../05-design-ui.md) §6): `scripts/tokens.ts` generates `src/styles/tokens.css` from `design/relay/tokens.json` (`:root` dark, `[data-theme="light"]` light); `src/styles/relay.css` = `design/relay/components/bundle.css` verbatim with the source version in a header comment; Tailwind for layout utilities only, its palette pointed at the CSS variables; fonts Space Grotesk 600 / Manrope 400·600·700 / JetBrains Mono 400·500 via `next/font/google` as `--font-display` / `--font-sans` / `--font-mono`; theme toggle on `data-theme`, persisted in a `theme` cookie, dark default. No hard-coded colours in components.
- **i18n**: `src/i18n/dictionaries.ts` with `en` (primary) and `pl`, identical key sets compile-checked (`satisfies Record<keyof typeof en, string>`); `useT()`; language switch in the header persisted in a `lang` cookie; every user-facing string goes through the dictionary from day one.
- `src/lib/api.ts`: server-side fetch to `API_INTERNAL_URL` that **forwards the `osid` cookie** from `next/headers` and turns a 401 into `redirect('/login')` — done now because MAGSpace learned it was the largest retrofit of its auth phase.
- Routes:
  - `/login` — "Sign in with Google" → `/api/auth/google`; error banner for `?error=not_allowed`.
  - `(admin)/layout.tsx` (async): `/auth/me` → `UserProvider`; shell = Relay `AppShell` — sidebar with nav groups **Flow** (Reports, Ideas) and **System** (Projects, Runs, Settings) and the owner card with sign-out; top bar with `rl-h1`, the worker-state badge, EN/PL switch, theme toggle.
  - `/admin` — the four Relay tiles from `/admin/dashboard` (Reports · 24 h, Analysed, Failed, Tokens · 24 h) + the filters row + the `rl-table` feed from `/admin/reports` with project/kind/status/period filters, cursor pagination in the panel footer. Row click opens the drawer as a third column showing the seeded demo result (read-only; triage actions and reruns are plan 04).
  - `/admin/ideas` — the card feed of `kind = IDEA` reports with the sticky analysis panel (read-only in this plan).
  - `/admin/projects` — project list column from `/admin/projects` with the selected project's read-only panels; "Add" button disabled with a tooltip (plan 02).
  - `/admin/runs` — `rl-table` of `AgentRun` rows from `/admin/runs` (project, report, model, status, tokens, cost, duration).
  - `/admin/settings` — read-only table of `AppSetting`.
  - `/p/[slug]/alarm`, `/p/[slug]/ideas`, `/p/[slug]/auth/callback` — placeholder pages outside the admin layout saying the project forms arrive in plan 02; they exist so the URL structure is fixed and the proxy config can be written once.

## 6. apps/agent-runner — `@bugbot/agent-runner` (stub)

- Node 22 + TS service with `GET /health` → `{ ok, workspacesDir, claudeVersion }` (runs `claude --version` once at boot, reports `null` if absent).
- `Dockerfile`: `node:22-bookworm-slim` + `git` + `@anthropic-ai/claude-code` **pinned to an exact version** (≥ 2.1.257 so the `fable` alias exists; bumped deliberately, never `latest`), non-root user, `/workspaces` and `/attachments` volumes declared. Built in CI but not started by the dev compose.
- `src/provider/` reserved with the interface stub `AgentProvider { run(job): Promise<RunResult> }` typed against `@bugbot/shared` placeholders — plan 03 fills it.

## 7. CI (GitHub Actions, optional but cheap)

`ci.yml` on push/PR: pnpm install → `pnpm -r lint` → `pnpm -r build` → api tests against a `postgres:16-alpine` service → build the three Docker images (no push). Deployment workflows come with the deployment plan.

## Definition of done

`pnpm i && docker compose up -d postgres && pnpm db:migrate && pnpm db:seed && pnpm dev` →
- `GET :3101/health` → `{ ok: true, db: true }`;
- `http://localhost:3000/login` → Google sign-in with the allowlisted address (or `AUTH_DEV_USER`) → `/admin` renders the four Relay tiles from the seed (Reports 3 · Analysed 1 · Failed 0 · Tokens from the demo run), the feed with `DEMO-1` ("Received", the disabled "Send to Claude" button until plan 04), `DEMO-2` and `DEMO-3`, and clicking `DEMO-2` opens the drawer with the seeded summary and JSON; `/admin/ideas`, `/admin/projects`, `/admin/runs` show the seeded rows; EN/PL switch changes every label; dark/light toggle keeps every screen readable; sign-out works;
- a non-allowlisted Google account lands on `/login?error=not_allowed` and creates no rows;
- `pnpm lint`, `pnpm build`, `pnpm test` green; `.env` not committed; docs updated (`02-entities.md` header flips from "nothing migrated" to the migration names; `04-decisions.md` gets the calls above once confirmed).

## Order of execution

scaffold → docker + env → shared enums + config schemas → api skeleton + prisma schema + migrations + seed → auth module + guard → admin read endpoints → tests baseline → web shell + tokens + i18n + `lib/api.ts` → login + admin pages + project placeholders → runner stub + Dockerfile → CI → commit.

## Risks / notes

- **Google Cloud console** is a manual step (Danyil): new OAuth client, redirect URI `http://localhost:3101/auth/google/callback`, test users = the allowlist; until then `AUTH_DEV_USER` carries development.
- `prisma migrate dev` is non-interactive on this Windows setup (MAGSpace note) — migrations are created with `--create-only` and applied with `migrate deploy`.
- The demo project's `authConfig` holds a throw-away key; plan 02 generates real key pairs and documents the MAGGuarantee side.
- Decimal columns (`budgetUsd`, `costUsd`) arrive as `Prisma.Decimal` — convert at the API boundary, never do float math on them.
- The API runs owner-guarded from the first commit, so nothing is exposed even if the port leaks; still, no deployment before plan 02's project guard exists.
- Repo rename to `BugBot` is a separate, trivial step — do it before the first push to GitHub to keep the remote name clean.
