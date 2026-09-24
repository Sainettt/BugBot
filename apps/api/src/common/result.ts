/**
 * Reads of the agent's result JSON that the cabinet needs before the result schemas exist
 * (plan 03). Both are derived, never stored (decision 2026-09-22 "needs a human is derived").
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** `is_bug = unclear` or `confidence < 0.5` — shown as "Needs a human" instead of "Analysed". */
export function needsHuman(resultJson: unknown): boolean {
  const r = asRecord(resultJson);
  if (!r) return false;
  if (r.is_bug === 'unclear') return true;
  return typeof r.confidence === 'number' && r.confidence < 0.5;
}

/** `result.severity` of a bug result (`critical` / `high` / `medium` / `low`); null otherwise. */
export function severityOf(resultJson: unknown): string | null {
  const r = asRecord(resultJson);
  return r && typeof r.severity === 'string' ? r.severity : null;
}
