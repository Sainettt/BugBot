import { z } from 'zod';

/**
 * Agent providers registered in code (PLAN.md §6). The key is the `Project.providerKey` column;
 * `Project.providerConfig` holds provider-specific extras validated by the matching schema.
 * The provider interface itself (run a job, return result + usage) is plan 03 — `provider/`.
 */
export const ProviderKey = {
  CLAUDE_CODE: 'claude-code',
} as const;
export type ProviderKey = (typeof ProviderKey)[keyof typeof ProviderKey];

/**
 * `claude-code` — Claude Code headless (`claude -p`) on the owner's subscription token
 * (decision 2026-09-24). Model, effort, turns, timeout, budget and tool profile are typed columns
 * of `Project`; only what has no column lives here. Strict on purpose: a typo in the cabinet must
 * fail on write, not be silently ignored by the runner.
 */
export const ClaudeCodeProviderConfigSchema = z
  .object({
    /** Pass image attachments to the agent (plan 03). */
    acceptsImages: z.boolean().optional(),
  })
  .strict();
export type ClaudeCodeProviderConfig = z.infer<typeof ClaudeCodeProviderConfigSchema>;

export const PROVIDER_CONFIG_SCHEMAS = {
  [ProviderKey.CLAUDE_CODE]: ClaudeCodeProviderConfigSchema,
} as const;

export type ProviderConfig = ClaudeCodeProviderConfig;

/** Parse `Project.providerConfig` with the schema of `Project.providerKey`. Throws on an unknown provider. */
export function parseProviderConfig(providerKey: string, value: unknown): ProviderConfig {
  const schema = PROVIDER_CONFIG_SCHEMAS[providerKey as ProviderKey];
  if (!schema) throw new Error(`Unknown provider: ${providerKey}`);
  return schema.parse(value);
}

/** Models a provider offers, in the form its CLI accepts. Defaults per decision 2026-09-24: Opus for both kinds. */
export const CLAUDE_CODE_MODELS = ['opus', 'fable', 'sonnet'] as const;
export const DEFAULT_MODEL_BUG = 'opus';
export const DEFAULT_MODEL_IDEA = 'opus';
