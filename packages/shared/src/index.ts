/**
 * @bugbot/shared — single source of truth for cross-app contracts.
 *
 * - `enums`  — every Prisma enum as a `const` object + union type (kept in sync by hand with
 *              apps/api/prisma/schema.prisma; see the note at the top of enums.ts).
 * - `config` — zod schemas for the JSON columns of `Project` (auth adapter, forms, recipients,
 *              limits, provider extras). The API validates on write, the web builds forms from them.
 * - `api`    — response shapes the web renders. Plain interfaces, no runtime.
 *
 * Reserved for later plans (README in each folder): `result/` (agent result JSON schemas, plan 03),
 * `provider/` (agent provider interface, plan 03), `handoff/` (handoff-token contract, plan 02).
 */

export * from './enums';
export * from './config';
export * from './api';
