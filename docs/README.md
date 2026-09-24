# BugBot — Documentation

Multi-project bug-report and idea triage platform for MAGTRANS internal apps. A user of a connected project files a bug (or its admin files an idea); an analysis agent with a git clone of that project's repository returns a structured, code-grounded report; the owner reads it in the cabinet and by e-mail. The product plan in Russian is [`../PLAN.md`](../PLAN.md); these docs are its English, code-level counterpart.

## Index
- [01-idea.md](01-idea.md) — why the project exists, roles, access model, non-goals, component map.
- [02-entities.md](02-entities.md) — entities, statuses, ERD, scenarios the schema must survive, integrity rules, Prisma schema v1 draft.
- 03-flows.md — *(planned)* handoff sign-in, report submission, queue → runner → result → notification, reruns, housekeeping.
- [04-decisions.md](04-decisions.md) — decision log (append-only, dated).
- [05-design-ui.md](05-design-ui.md) — the Relay design system → BugBot: tokens, component CSS, status vocabulary, screen-by-screen mapping, deliberate differences, re-sync procedure. The system itself is committed at [`../design/relay/`](../design/relay/).
- 06-contracts.md — *(planned)* what other repositories implement: handoff token, provider interface, auth adapter, result JSON schemas, project config schema.
- [plans/](plans/) — implementation plans, in execution order:
  - [plans/01-foundation.md](plans/01-foundation.md) — **done 2026-09-24** — monorepo skeleton, Postgres in Docker, the full Prisma schema + integrity migration, owner Google sign-in, cabinet shell with EN/PL i18n and the read-only feed, runner stub, tests baseline, CI.
  - 02 — *(planned)* project entity + config page, `handoff-jwt` adapter and project sessions, alarm / ideas forms with attachments; the MAGGuarantee-side button and token endpoint.
  - 03 — *(planned)* agent runner: workspaces, `claude-code` provider, prompt layers and presets, result schemas, manual test run from the cabinet.
  - 04 — *(planned)* queue worker, sweeper, notifications, "Send to Claude", triage actions and reruns — the full cycle from a submitted report to the e-mailed plan.

## Stack
NestJS · Prisma · PostgreSQL · Next.js (App Router) · Claude Code headless (`claude -p`) as the first agent provider · pnpm monorepo (apps/api, apps/web, apps/agent-runner, packages/shared) · target deployment: company VPS, docker-compose + TLS proxy, like MAGGuarantee and MAGSpace.

## Conventions
Docs in English, PLAN.md in Russian, conversation with the user in Russian. Code / DB / identifiers English; connected projects' vocabulary (przewoźnik, wniosek, stanowisko) untranslated. Agents for Claude Code live in `.claude/agents/` (see `CLAUDE.md`).
