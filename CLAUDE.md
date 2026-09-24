# BugBot — context for Claude

> Auto-loaded by Claude Code on session start. Keep it short — point to docs, don't duplicate them.

## What this project is

**BugBot** — a multi-project bug-report and idea triage platform for MAGTRANS internal apps. A user of a connected project (first: MAGGuarantee; next: MAGSpace) files a bug on `/p/<slug>/alarm`; the project's admin files an idea on `/p/<slug>/ideas`. The owner is e-mailed and presses "Send to Claude" in the cabinet; an analysis agent with a git clone of that project's repository returns a structured, code-grounded report (root cause + fix plan for bugs; impact + risks + plan for ideas). The owner reads it in the cabinet `/admin` and gets an e-mail. **The plan is the product; everything else is scaffolding.**

Three invariants: **connecting a project = configuration, not code** · **the analysis agent is read-only** (no writes, no secrets of the analysed project, hard time and budget caps) · **no automatic analysis** — every agent run is started by the owner's "Send to Claude" in the cabinet (decision 2026-09-24: the runner uses the owner's Claude subscription via `claude setup-token`, and the manual trigger keeps that within personal use; automatic queueing returns with API-key billing).

The repository is still called `MAGGuaranteeBugBot`; renaming to `BugBot` is pending (PLAN.md §13).

## Language rules

- Code, DB, identifiers, comments and `docs/`: **English** (decision 2026-09-22). `PLAN.md` (the product plan) is Russian. The user (Danyil, admin/informatyk) communicates in **Russian** — answer in Russian.
- Vocabulary of the connected projects stays untranslated: przewoźnik, wniosek, stanowisko, MAGGuarantee role names (`przewoznik`, `opiekun`, `planista`…).
- UI: a project's forms render in that project's language (`Project.formLocale`; MAGGuarantee: Polish by default, switchable). The owner cabinet is **English + Polish** (i18n dictionary as in MAGSpace: `en` + `pl`, compile-checked keys, never hard-coded copy; English default). The agent's report language is a per-project setting (`reportLocale`, default Russian).

## Stack & layout (decided 2026-09-22)

pnpm monorepo: `apps/api` (NestJS + Prisma + PostgreSQL — HTTP API and the queue worker) · `apps/web` (Next.js App Router) · `apps/agent-runner` (one git clone per project + agent providers; first provider = Claude Code headless `claude -p`; model Opus for bugs and ideas, `fable` optional per project; auth = subscription token in `CLAUDE_CODE_OAUTH_TOKEN` — decisions 2026-09-24) · `packages/shared` (result JSON schemas, project-config schemas, provider / auth-adapter / handoff-token contracts, enums mirrored from Prisma). Deployment target: the company VPS, docker-compose behind the TLS proxy, like MAGGuarantee and MAGSpace. Plan 01 is done (2026-09-24): `packages/shared`, `apps/api` (schema + migrations, seed, owner auth, read-only `/admin/*`, integration tests on schema `bugbot_test`), `apps/web` (Relay-styled read-only cabinet, EN/PL, URL-driven server components), the `apps/agent-runner` stub, three Dockerfiles and CI. Next: plan 02 (project config page, `handoff-jwt` adapter, public forms). Plans in `docs/plans/` set the order. Dev machine: Node via fnm (`eval "$(fnm env --shell bash)"` in tool shells), Postgres on host port 5433.

## Where to look

| Need | File |
|---|---|
| Product plan, scope, open questions (Russian) | [`PLAN.md`](PLAN.md) |
| Overview in English: roles, flow, non-goals | [`docs/01-idea.md`](docs/01-idea.md) |
| Entities, statuses, ERD, Prisma conventions | [`docs/02-entities.md`](docs/02-entities.md) |
| Flows: handoff sign-in, queue, agent run, notifications | `docs/03-flows.md` (planned) |
| Decision log (append-only, dated) | [`docs/04-decisions.md`](docs/04-decisions.md) |
| Design → UI mapping: tokens, `rl-*` components, screens, what differs from the mockups | [`docs/05-design-ui.md`](docs/05-design-ui.md) |
| The Relay design system itself (tokens, component CSS, page mockups; verbatim copy, never edited by hand) | [`design/relay/`](design/relay/) |
| Contracts other repositories implement (handoff token, provider, auth adapter, result schema) | `docs/06-contracts.md` (planned) |
| Implementation plans, in execution order | `docs/plans/` |
| Analysis presets (bug / idea) and prompt layers | `apps/agent-runner/presets/` (planned) |
| Full doc index | [`docs/README.md`](docs/README.md) |

Connected projects live next to this repo: `../MAGGuarantee` (docs in Russian, `CLAUDE.md`, roles in `docs/03-roles.md`, auth in `docs/15-auth-strategy.md`) and `../MAGSpace` (docs in English). Read them when a change touches the handoff contract or a project brief; never modify them from this session unless asked.

## Agents (.claude/agents/)

planner (feature / schema plans, opus) · researcher (how-does-X-work, sonnet) · code-reviewer (sonnet) · test-writer (sonnet) · debugger (opus) · security-auditor (opus) · docs (sonnet) · preset-designer (analysis prompts, result schemas, project briefs; opus). Delegate accordingly; the main session integrates.

## Working agreements

- The user wants clarifying questions before implementation — concrete options + a recommendation; never silently guess business rules. Record outcomes in `docs/04-decisions.md`.
- Every query on project-scoped data is filtered by the session's `projectId`. Every owner action writes a `HistoryEvent`.
- Report text and attachments are untrusted input everywhere: in prompts (untrusted block only), in rendering (escape), in logs (no raw report text).
- Secrets live in env; the DB stores env variable *names* only. Never paste secret values into prompts, docs or commits.
- UI follows the Relay design system: colours only through the tokens (`design/relay/tokens.json` → `tokens.css`), components through the `rl-*` classes, one primary button and one accent spot per screen, no toasts / spinners / animations, machine values monospace. The mockups' Russian copy is reference only — cabinet strings live in the EN/PL dictionary.
- Job / report / run state changes happen in one transaction with their side-effect record (notification row, history event), so a retry can never send the same e-mail twice.
