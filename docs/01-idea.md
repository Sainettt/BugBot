# 01 — Idea

English digest of [`PLAN.md`](../PLAN.md) (Russian, the authoritative product plan). When the two disagree, PLAN.md wins and this file gets fixed.

## Why

Bug reports and change requests for MAGTRANS internal apps arrive as chat messages and hallway talk. Every one of them costs the developer the same first hour: find the place in the code, understand what really happens, decide whether it is a bug, sketch a fix. BugBot moves that hour to an agent.

- A **reporter** (an employee or an external carrier who has an account in the connected project) files a bug on the project's alarm page.
- A **project admin** (the boss) files an idea on the project's ideas page.
- The report is queued. An **analysis agent** with a git clone of the project's repository reads the code and returns a structured, code-grounded report: for a bug — where, why, is it really a bug, confidence, fix plan, tests, risks, questions for the reporter; for an idea — impact areas, risks, 1–3 options, a recommended step-by-step plan, effort, questions for the author.
- The **owner** reads it in the cabinet and gets an e-mail with the report attached.

**The plan is the product.** Forms, queue, runner and mail are scaffolding around it.

## Multi-project

BugBot serves many projects. The first is MAGGuarantee (kilometre-guarantee claims for carriers; NestJS + Prisma + Next.js), the next is MAGSpace (workplace and equipment management). Connecting a project is a configuration task in the cabinet: repository, agent provider and model, prompt brief, auth adapter, form fields, recipients, limits. The only code a connected project needs is a "Report a bug" button and one endpoint that issues a handoff token (see below).

## Roles

| Role | Who | Does | Where |
|---|---|---|---|
| Owner | the BugBot operator (Danyil) | configures projects, reads reports, reruns analyses, triages | `/admin` |
| Project admin | the boss and whoever the project config names | files ideas for their project | `/p/<slug>/ideas` |
| Reporter | any user of the connected project — employee or external carrier | files bugs | `/p/<slug>/alarm` |
| Agent | Claude Code (headless) or another provider | reads code, writes the report | agent runner |

## Access

- **Reporters and project admins** never get a BugBot password. The connected project, where they are already signed in, issues a short-lived signed **handoff token** (`iss` = project slug, `aud` = `bugbot`, `exp` ≈ 60 s, one-time `jti`, claims `sub`, `email`, `name`, `roles[]`, `locale`) and redirects to BugBot, which verifies it with the project's public key and opens a project-scoped session. Who may report and who counts as admin is a rule in the project config applied to the token's roles. Nobody outside the connected project can get in.
- **The owner** signs in with Google; allowed e-mails are an env variable. No password fallback — if Google is down, the e-mails still arrive.

## Non-goals (v1)

- The agent never modifies code, commits, or opens pull requests.
- No conversation with the agent: one report → one analysis (reruns allowed).
- No public status tracker for reporters.
- No per-project databases or tables: one schema, every row carries `projectId`.

## Components

```
project A (MAGGuarantee)        project B (MAGSpace)
  "Report a bug" ──┐              "Report a bug" ──┐
                   │ handoff token                 │
                   ▼                               ▼
        ┌──────────────────────────────────────────────┐
        │ apps/web (Next.js)                           │
        │ /p/<slug>/alarm  /p/<slug>/ideas   /admin    │
        └───────────────────────┬──────────────────────┘
        ┌───────────────────────▼──────────────────────┐      ┌──────────┐
        │ apps/api (NestJS)                            │◄────►│ Postgres │
        │ projects · auth adapters · reports · jobs    │      └──────────┘
        │ agent providers · notifications · storage    │
        └───────────────────────┬──────────────────────┘
                                │ job (project, report, kind)
        ┌───────────────────────▼──────────────────────┐
        │ apps/agent-runner                            │
        │ /workspaces/<slug> per project               │
        │ provider: claude -p  (others later)          │
        └───────────────────────┬──────────────────────┘
                                │ result JSON + log + usage
                                ▼
                     cabinet + e-mail to the project's recipients
```

Details: entities in [02-entities.md](02-entities.md), decisions in [04-decisions.md](04-decisions.md).
