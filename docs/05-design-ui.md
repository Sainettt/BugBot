# 05 — Design → UI mapping

Source: the **Relay** design system made in Claude Design (owner: Danyil), committed verbatim at [`design/relay/`](../design/relay/) (`tokens.json`, `components/bundle.css`, brand book `README.md`, `flows.md`, 12 component previews, 4 page mockups). Live copy: <https://claude.ai/artifact/So3gv1WgCpE5AZFHqaLy6S>. Relay's names, copy and some mechanics belong to a different product; **the look is binding, the words are not** (user, 2026-09-22). This file says what BugBot takes as-is, what it renames, and what it deliberately does differently.

## 1. What is taken as-is

- **Tokens** — every colour, type style, spacing step, radius, shadow and size from `design/relay/tokens.json`, in both themes. Dark is the default theme, light is derived (same tokens, other values). Nothing in `apps/web` hard-codes a colour; components reference `var(--surface-200)` etc.
- **Component CSS** — `design/relay/components/bundle.css` is copied to `apps/web/src/styles/relay.css` and the `rl-*` class names are kept verbatim, so a future re-sync from the design system is a diff, not a rewrite. Tailwind is used for layout utilities only (grid, flex, gap, responsive), with its palette pointed at the same CSS variables.
- **Fonts** — Space Grotesk 600 (display), Manrope 400/600/700 (UI), JetBrains Mono 400/500 (machine values), loaded with `next/font/google` and exposed as `--font-display`, `--font-sans`, `--font-mono`.
- **Rules from the brand book** that shape the code: one `rl-btn--primary` per screen; one accent spot per screen; status always carries a word, colour is secondary; machine values (`MAGG-42`, model ids, JSON, token counts) always monospace; numbers in tables and tiles monospace and right-aligned; no toasts, spinners, skeletons or animations except 120 ms colour transitions; empty state is one `ink-300` line inside the panel; icons are inline SVG, 1.4–1.6 px stroke, square caps; focus ring 2 px `focus-ring` everywhere, never removed.

### Colour tokens (dark / light)

| Token | Dark | Light | Used for |
|---|---|---|---|
| `surface-000` | `#07090c` | `#e6ebf1` | sidebar, table header, code panes |
| `surface-100` | `#0b0f14` | `#f7f9fb` | page background |
| `surface-200` | `#11161d` | `#ffffff` | panels, cards, drawer |
| `surface-300` | `#171e27` | `#f1f4f8` | inputs, inactive tabs |
| `surface-400` | `#1e2731` | `#e7ecf2` | hover, selected row |
| `line-soft` / `line-strong` | `#1b232c` / `#2c3947` | `#e2e8ef` / `#c3cedb` | panel borders / control borders |
| `ink-100` / `ink-200` / `ink-300` | `#e8eef5` / `#9fb0c0` / `#70859a` | `#0e141b` / `#41505f` / `#5d6e7e` | primary / secondary / meta text — never below `ink-300` |
| `accent-100` / `accent-200` / `accent-soft` / `on-accent` | `#43e0c0` / `#1f8f7c` / `#43e0c01f` / `#04130f` | `#0a7a66` / `#06564a` / `#0a7a6614` / `#ffffff` | primary button, active nav, report id, focus |
| `info-100` / `info-soft` | `#4aa8ff` / `#4aa8ff1f` | `#1160c4` / `#1160c414` | queued, severity medium |
| `warn-100` / `warn-soft` | `#f5a524` / `#f5a5241f` | `#8a5a00` / `#8a5a0014` | needs a human, severity high |
| `danger-100` / `danger-soft` | `#ff6b6b` / `#ff6b6b1f` | `#c42a2a` / `#c42a2a14` | analysis failed, severity critical, destructive |
| `success-100` / `success-soft` | `#3ddc84` / `#3ddc841f` | `#0f7a48` / `#0f7a4814` | analysed, e-mail sent |
| `neutral-soft` | `#9fb0c01a` | `#41505f12` | neutral badges, chips, severity low |
| `scrim` | `#050709cc` | `#0e141b66` | under modals |

Type: `t-display-lg` 40/44 · `t-display-md` 28/34 · `t-title` 20/26 · `t-subtitle` 16/22 · `t-body` 14/21 · `t-body-sm` 13/19 · `t-caption` 12/16 · `t-eyebrow` 11/14 caps 0.12em · `t-button` 13/16 · `t-mono` 13/20 · `t-mono-sm` 11/16 · `t-metric` 26/30. Spacing `space-1…8` = 4…64 px. Radii 4 / 8 / 12 / pill. Sizes: controls 28 / 36 / 44, sidebar 232, drawer 460, content max 1120, public form max 620.

## 2. Names: Relay → BugBot

| Relay | BugBot |
|---|---|
| Relay, `rl-mark` logo | BugBot; the mark (two chevrons + dot) stays as a placeholder until there is a real identity |
| `RLY-2481` / `RLI-118` | one per-project code for bugs and ideas: `MAGG-42`, `MAGS-7` |
| Репорты / Предложения / Конфигурация / Журнал анализа | Reports / Ideas / Projects / Runs (+ Settings) — EN and PL dictionaries, the Russian copy of the mockups is reference only |
| Администратор (sidebar user card) | the signed-in owner: initials, name, "Owner" |
| Ingest-ключ, разрешённые домены | handoff issuer + public keys (`kid`); no domain allowlist — the token's `iss`/`aud` do that job |
| Инструкция для разбора | project brief + overrides, versioned (`PromptVersion`) |
| Лимит токенов на репорт | `maxTurns` + `budgetUsd` + `timeoutSec` |
| Токенов за сутки | tokens **and** cost for the period |

## 3. Status vocabulary

Relay's six report badges map onto BugBot's two status fields plus one derived flag:

| Badge (Relay) | Class | BugBot |
|---|---|---|
| Принят | `rl-badge` | `analysisStatus = NOT_SENT` ("Received" — waiting for the owner's "Send to Claude"); also the public receipt page |
| В очереди | `--info` | `analysisStatus = QUEUED` |
| Анализируется | `--accent` | `RUNNING` |
| Разобран | `--ok` | `DONE` |
| Нужен человек | `--warn` | **derived**: `DONE` and the result says `is_bug = unclear` or `confidence < 0.5`; shown instead of "Analysed", plus a `rl-callout--warn` above the summary |
| Сбой анализа · `code` | `--danger` | `FAILED`; the error code (`RESULT_SCHEMA`, `TIMEOUT`, `PROVIDER_5XX`) monospace after the dot |

`rl-sev` = `result.severity` from the bug result schema (`critical` / `high` / `medium` / `low`), lower-case, monospace, never for ideas. Ideas show the value / effort meters instead (section 4.3).

Owner triage (`triageStatus`) is not a badge in the design; it is the row's dimming (cards at 62 % opacity when not `NEW`) and the action buttons. Actions per kind:

| Kind | Buttons (design) | `triageStatus` |
|---|---|---|
| bug | В работу / Переслать / Дубликат | `IN_PROGRESS` / forward e-mail (action, no status change) / `ARCHIVED` with `ownerNote = duplicate of …` |
| idea | В бэклог / Отложить / Отклонить | `IN_PROGRESS` / `SEEN` / `ARCHIVED` |

`HANDLED` has no button in the design; it is set from the report card's tab "History" when the owner marks the work done. Revisit if it stays unused.

## 4. Screens

### 4.1 Cabinet shell (`AppShell`) → `(admin)/layout.tsx`

Sidebar `sidebar-w` on `surface-000`: mark, nav in two groups — **Flow**: Reports (count of `NEW`), Ideas (count of `NEW` ideas); **System**: Projects, Runs, Settings — owner card at the bottom (initials, name, sign out). Top bar: `rl-h1` page title, on the right a state badge (`rl-badge--accent` "Worker running · 1" / `--warn` "Worker paused") and at most one action. Filters never go into the top bar. Content column `content-max`, gap `space-5`, padding `space-6`. The report drawer (`rl-drawer`, `drawer-w`) is a third column to the right of the content, not an overlay; the list stays visible.

### 4.2 Reports (`PageReports`) → `/admin` (and `/admin/reports`)

- Four tiles (`rl-stat`): Reports · 24 h (note: yesterday's count) · Analysed (`--accent`, note: share without a human) · Failed (`--danger` only when > 0, note: dominant error code) · Tokens · 24 h (note: cost in USD). Period segment 24 h / 7 d / all drives both tiles and list. Queue depth is a badge in the top bar, not a fifth tile.
- Filters row: search (title, code, reporter), project select, kind select (bug / idea / all), status select, period `rl-seg`, "Reset" quiet button.
- Table: Report (title + `rl-id` code · project · reporter) · Severity · Status · Tokens (`rl-num`, "—" when no run) · Time (relative). Row click opens the drawer, `aria-selected` marks it. Footer: "Showing 8 of 18" + Back / Next (cursor pagination from `/admin/reports`).
- Drawer = report card: head (code, severity, status, title, project · reporter · role · time, close), tabs **Summary / Result JSON / E-mail / Original / Runs**. Summary = the result's plain-language summary first, then `rl-kv` (component → `affected_areas`, cause → `root_cause`, similar → later, what to do → `fix_plan` first step, confidence), then the `rl-code` pane with `report.json` (highlighted server-side), usage line `18 420 tokens · 6.4 s · claude-opus-5` and "Download". Then `rl-callout--ok` "E-mail sent · recipients · time" (from `Notification`), then the action buttons of section 3. While the report is `NOT_SENT`, the drawer's only `rl-btn--primary` is **Send to Claude** (`POST /admin/reports/:id/analyze`, decision 2026-09-24) and the Summary tab shows the original fields instead of a result. Runs tab lists every `AgentRun` with model, prompt version, cost and a "Rerun with…" form.

### 4.3 Ideas (`PageIdeas`) → `/admin/ideas`

Left: card feed (`rl-panel idea`) — author · project · time, the idea text at 15/23, tags from the result's `impact_areas`, a state badge (Analysed / Needs details / Backlog), footer with "similar: n" and Postpone / Open analysis. Cards not `NEW` dim to 62 %. Right, sticky: `rl-panel--raised` "Idea analysis" with the code, summary, two meters — **Value** (`rl-meter`, from a `value` field the idea result schema gets in plan 03) and **Effort** (`--warn`, from `effort_estimate`) — then `rl-kv` (topic, similar, impact areas, run usage), the actions Backlog / Postpone / Reject. The "Reply to author" textarea exists in the design and is **hidden until plan 05** (reporter e-mails). The callout under the panel says that ideas are e-mailed per project config, not the design's "weekly digest" text.

### 4.4 Projects (`PageConfig`) → `/admin/projects`

Two columns: project list (`pitem`: name, `codePrefix`, reports count, model; `aria-current`) with "Add" ghost button in the panel head; right column = panels of the selected project, in this order: **Project** (name, slug, code prefix, status switch in the panel head, form link in the footer, "Archive project" danger button — never "Delete"), **Repository** (URL, branch, subpath, env name of the key, "Check" button, last commit), **Agent** (model cards from the provider's list — id, note, context, average run time and cost from our own runs; bug and idea model; turns / timeout / budget; tool profile), **Prompts** (brief and overrides as `rl-textarea--mono`, version list, "Save as version v7" + "Activate"), **Access** (issuer, public keys with `kid`, reporter and admin rules, the handoff contract text to copy), **Forms** (field builder), **Notifications** (recipients per kind, "Send test" in the footer). Relay's top tabs (Projects / Models / Notifications / Access) are not used — everything is per project. Relay's `rl-switch` rows "apply immediately": true for the status switch and simple fields (autosave with a `rl-hint` "Saved"); **prompt edits are explicit** because they create a version.

### 4.5 Runs (Журнал анализа) → `/admin/runs`

Not mocked in Relay beyond the nav item. A `rl-table`: time · project · report code · kind · model · prompt version · status · turns · tokens · cost · duration; row click opens the same drawer as Reports on the Runs tab. Filters: project, status, model, period.

### 4.6 Public report form (`PageBugReport`) → `/p/<slug>/alarm`

No shell. Top bar `surface-000`: mark + "Signed in as `email`" (from `ProjectSession`). Hero: eyebrow "`<Project>` · report a problem" in `accent-100`, `t-display-lg` question, one paragraph, then `rl-chip`s of what BugBot already knows — project, your role, browser (from the user agent), locale. Form in `rl-panel--raised`, `form-max`: title, description with `rl-counter` (4000), a `split` row with **impact** `rl-seg` (minor / hinders / blocks — a field in the default `formConfig.bug`) and **when** select (just now / today / this week / for a long time), dropzone (accepted types and 10 MB written out, files listed as `rl-file`), a neutral callout explaining what is attached automatically and that passwords are never collected. Footer: one `rl-btn--primary rl-btn--lg rl-btn--block` "Send report" (text "Sending…" + disabled while in flight), a foot note. After submit — the **receipt** panel: `rl-badge--ok` "Report received" + `rl-id` `MAGG-42`, "Thanks, we take it from here", three steps (received · being analysed · goes to the owner), "Report another" quiet button. The reporter is told they do not need to come back.

Language of this page = `Project.formLocale` (MAGGuarantee: PL, switch to EN in the top bar).

### 4.7 Ideas form → `/p/<slug>/ideas`

Not mocked. Same layout as 4.6 with the idea fields from `formConfig.idea` (what to change, why, who is affected, priority as `rl-seg`), the eyebrow "`<Project>` · idea", and the receipt without the "being analysed in under a minute" promise (idea analyses are allowed to take longer).

## 5. Deliberate differences from the mockups

| Relay shows | BugBot does | Why |
|---|---|---|
| Ingest key + allowed domains | Handoff token verified with the project's public key | Decision 2026-09-22; nobody outside the connected project may report |
| Fallback model on 429 | Retry with backoff, same model | Not in v1; a `fallbackModel` config field is a later addition |
| A submitted report is "В очереди" at once | "Received" until the owner presses "Send to Claude" | Decision 2026-09-24: the runner uses the owner's Claude subscription, so every run is the owner's own action; automatic queueing returns with API-key billing |
| "Write from severity ≥ medium" mail threshold | Every finished run mails the project's recipients | Owner wants everything in the cabinet **and** mailbox; threshold is a later option |
| Subject template with placeholders | Fixed `[MAGG][bug] MAGG-42: title` | One owner, one format; PLAN.md §4 |
| Ideas never e-mail, weekly digest | Ideas mail per `notificationConfig.idea.to` | Decision 2026-09-22 (boss may be a recipient) |
| "Reply to author" | Hidden until plan 05 | No reporter e-mails in v1 |
| "Find duplicates" switch, "similar reports" rows | Hidden / "—" until plan 05 | Dedup is stage-5 scope in PLAN.md |
| "Hide author contacts from the model" switch | Not in v1 | Reporter e-mail is not put into the prompt anyway; role and name are (the role matters for analysis) |
| Model card "accuracy 0.86" | Context window + our own average duration and cost | We have no accuracy metric; showing one would be invented |
| Delete project (danger) | Archive project (danger) | Nothing is hard-deleted (02-entities §6) |
| Auto-collected chips: app version, screen, last actions | Project, role, browser, locale | BugBot has no in-app SDK collecting context; the handoff token and the user agent are what exists. An in-app context collector is a possible later addition |
| Export CSV | Not in v1 | — |

## 6. Implementation notes for `apps/web`

- `src/styles/tokens.css`: generated from `design/relay/tokens.json` by `apps/web/scripts/tokens.mjs` (`pnpm --filter @bugbot/web tokens`; the output is committed, re-run on re-sync): `:root` = dark values, `[data-theme="light"]` = light values, font families, spacing, radii, shadows, sizes as `--<name>`.
- `src/styles/relay.css`: `bundle.css` verbatim plus a header comment with the source version (`1790069834-cd20`). Page-specific CSS from the mockups (`.stats`, `.filters`, `.pitem`, `.mcard`, `.idea`, `.hero`, `.steps`…) becomes CSS modules next to the page that uses it, with the same names.
- Theme: `data-theme` on `<html>`, toggle in the top bar, persisted in the `theme` cookie; default dark. Light theme must be checked on every screen — the brand book requires 4.5:1 on every text pair in both themes.
- Icons: inline SVG components in `src/components/icons/`, copied from the previews (search, upload, info, warn, fail, ok, chevron, plus).
- Re-sync procedure: read the design system files again (Artifact tool, `project/…`), copy into `design/relay/`, diff `tokens.json` and `bundle.css`, re-run the tokens script, review page CSS modules against the changed previews, note the new version in `relay.css`.
