# handoff/ — reserved for plan 02

The handoff-token contract a connected project implements (PLAN.md §5.3, decision 2026-09-22):
ES256-signed JWT with `iss` = project slug, `aud` = `bugbot`, `exp` ≈ 60 s, one-time `jti`,
claims `sub`, `email`, `name`, `roles[]`, `locale`, header `kid`. Types and the claim schema land
here; the verification lives in apps/api.
