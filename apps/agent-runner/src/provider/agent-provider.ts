import type { ProviderKey, ReportKind } from '@bugbot/shared';

/**
 * The agent provider contract (PLAN.md §6.1) — a placeholder shape so the package compiles
 * against `@bugbot/shared` from day one. Plan 03 moves the input/output types into
 * `packages/shared/src/provider/` and implements `claude-code` here.
 */

export interface RunJob {
  runId: string;
  projectSlug: string;
  kind: ReportKind;
  /** Absolute path of the project's clone (read-only for the agent). */
  workspaceDir: string;
  model: string;
  effort: string | null;
  maxTurns: number;
  timeoutSec: number;
  budgetUsd: string;
  toolProfile: string;
  systemPrompt: string;
  taskPrompt: string;
  attachmentPaths: string[];
}

export interface RunResult {
  resultJson: unknown;
  log: string;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    cacheReadTokens: number | null;
    cacheWriteTokens: number | null;
    numTurns: number | null;
    costUsd: string | null;
    /** The concrete model id the provider reports (never the alias from the config). */
    model: string;
  };
  stopReason: 'done' | 'max_turns' | 'budget' | 'timeout' | 'error';
  error: string | null;
}

export interface AgentProvider {
  readonly key: ProviderKey;
  run(job: RunJob, signal: AbortSignal): Promise<RunResult>;
}
