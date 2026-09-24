import { z } from 'zod';

/**
 * Auth adapters a project can choose (PLAN.md §5.5). The adapter key is the `Project.authAdapter`
 * column; `Project.authConfig` holds the adapter-specific JSON validated by the matching schema
 * below. `google-allowlist` and `shared-password` are later adapters — add a key and a schema here,
 * never a column.
 */
export const AuthAdapter = {
  HANDOFF_JWT: 'handoff-jwt',
} as const;
export type AuthAdapter = (typeof AuthAdapter)[keyof typeof AuthAdapter];

/** `*` in a roles list means "any role of the connected project". */
export const ANY_ROLE = '*';

/** One verification key. A list allows rotation without downtime (02-entities §4.10). */
export const HandoffPublicKeySchema = z.object({
  /** Matches the `kid` header of the tokens the project signs with this key. */
  kid: z.string().min(1).max(64),
  /** PEM-encoded public key (ES256 — the algorithm is pinned on the BugBot side). */
  pem: z.string().min(1),
  /** ISO timestamp; tokens issued before it are refused. Optional. */
  notBefore: z.string().datetime({ offset: true }).optional(),
});
export type HandoffPublicKey = z.infer<typeof HandoffPublicKeySchema>;

const RoleList = z.array(z.string().min(1).max(64));
const EmailList = z.array(
  z
    .string()
    .email()
    .transform((s) => s.toLowerCase()),
);

/**
 * `handoff-jwt` — the connected project signs a short-lived token for its signed-in user and
 * redirects to BugBot (decision 2026-09-22). Who may report and who counts as admin is decided
 * here, applied to the token's `roles` / `sub` / `email` claims.
 */
export const HandoffJwtAuthConfigSchema = z.object({
  /** Expected `iss` claim — by convention the project slug. */
  issuer: z.string().min(1).max(64),
  publicKeys: z.array(HandoffPublicKeySchema).min(1),
  /** Roles allowed on the alarm page; `["*"]` = everyone the project signed in. */
  reporterRoles: RoleList.min(1),
  /** Roles that see the ideas page. */
  adminRoles: RoleList.default([]),
  /** Specific `sub` claims that see the ideas page regardless of role. */
  adminSubs: z.array(z.string().min(1)).default([]),
  /** Specific e-mails that see the ideas page regardless of role (the boss). */
  adminEmails: EmailList.default([]),
  /** Project-session lifetime; 8 h by default. */
  sessionTtlMin: z
    .number()
    .int()
    .min(5)
    .max(24 * 60)
    .default(480),
});
export type HandoffJwtAuthConfig = z.infer<typeof HandoffJwtAuthConfigSchema>;
export type HandoffJwtAuthConfigInput = z.input<typeof HandoffJwtAuthConfigSchema>;

export const AUTH_CONFIG_SCHEMAS = {
  [AuthAdapter.HANDOFF_JWT]: HandoffJwtAuthConfigSchema,
} as const;

export type AuthConfig = HandoffJwtAuthConfig;

/** Parse `Project.authConfig` with the schema of `Project.authAdapter`. Throws on an unknown adapter. */
export function parseAuthConfig(adapter: string, value: unknown): AuthConfig {
  const schema = AUTH_CONFIG_SCHEMAS[adapter as AuthAdapter];
  if (!schema) throw new Error(`Unknown auth adapter: ${adapter}`);
  return schema.parse(value);
}
