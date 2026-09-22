# BugBot — context for Claude

> Auto-loaded by Claude Code on session start. Keep it short — point to docs, don't duplicate them.

## What this project is

**BugBot** — a multi-project bug-report and idea triage platform for MAGTRANS internal apps. A user of a connected project (first: MAGGuarantee; next: MAGSpace) files a bug on `/p/<slug>/alarm`; the project's admin files an idea on `/p/<slug>/ideas`. The report is queued; an analysis agent with a git clone of that project's repository returns a structured, code-grounded report (root cause + fix plan for bugs; impact + risks + plan for ideas). The owner reads it in the cabinet `/admin` and gets an e-mail. **The plan is the product; everything else is scaffolding.**

Two invariants: **connecting a project = configuration, not code** · **the analysis agent is read-only** (no writes, no secrets of the analysed project, hard time and budget caps).

The repository is still called `MAGGuaranteeBugBot`; renaming to `BugBot` is pending (PLAN.md §13).

## Language rules

- Code, DB, identifiers, comments and `docs/`: **English** (decision 2026-09-22). `PLAN.md` (the product plan) is Russian. The user (Danyil, admin/informatyk) communicates in **Russian** — answer in Russian.
- Vocabulary of the connected projects stays untranslated: przewoźnik, wniosek, stanowisko, MAGGuarantee role names (`przewoznik`, `opiekun`, `planista`…).
- UI: a project's forms render in that project's language (MAGGuarantee: Polish by default, switchable); the owner cabinet language is not decided yet.

## Stack & layout (decided 2026-09-22)

pnpm monorepo: `apps/api` (NestJS + Prisma + PostgreSQL — HTTP API and the queue worker) · `apps/web` (Next.js App Router) · `apps/agent-runner` (one git clone per project + agent providers; first provider = Claude Code headless `claude -p`) · `packages/shared` (result JSON schemas, project-config schemas, provider / auth-adapter / handoff-token contracts, enums mirrored from Prisma). Deployment target: the company VPS, docker-compose behind the TLS proxy, like MAGGuarantee and MAGSpace. **Nothing is scaffolded yet** — plans in `docs/plans/` set the order.

## Where to look

| Need | File |
|---|---|
| Product plan, scope, open questions (Russian) | [`PLAN.md`](PLAN.md) |
| Overview in English: roles, flow, non-goals | [`docs/01-idea.md`](docs/01-idea.md) |
| Entities, statuses, ERD, Prisma conventions | [`docs/02-entities.md`](docs/02-entities.md) |
| Flows: handoff sign-in, queue, agent run, notifications | `docs/03-flows.md` (planned) |
| Decision log (append-only, dated) | [`docs/04-decisions.md`](docs/04-decisions.md) |
| Contracts other repositories implement (handoff token, provider, auth adapter, result schema) | `docs/05-contracts.md` (planned) |
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
- Job / report / run state changes happen in one transaction with their side-effect record (notification row, history event), so a retry can never send the same e-mail twice.
