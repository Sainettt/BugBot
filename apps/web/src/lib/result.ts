/**
 * Reads of the agent's result JSON the cabinet renders before the result schemas exist
 * (plan 03). Everything is optional and defensive: a result may be invalid or from an older
 * schema version, and the drawer must still open.
 */

export interface ResultView {
  summary: string | null;
  severity: string | null;
  confidence: number | null;
  isBug: string | null;
  areas: string[];
  rootCause: string | null;
  firstStep: string | null;
  effort: string | null;
  value: number | null;
  risks: string[];
  questions: string[];
}

function rec(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function readResult(resultJson: unknown): ResultView {
  const r = rec(resultJson) ?? {};
  const plan = Array.isArray(r.fix_plan)
    ? r.fix_plan
    : Array.isArray(r.recommended_plan)
      ? r.recommended_plan
      : [];
  const first = plan[0];
  return {
    summary: str(r.summary),
    severity: str(r.severity),
    confidence: typeof r.confidence === 'number' ? r.confidence : null,
    isBug: str(r.is_bug),
    areas: strList(r.impact_areas).length ? strList(r.impact_areas) : strList(r.affected_areas),
    rootCause: str(r.root_cause),
    firstStep: typeof first === 'string' ? first : (str(rec(first)?.title) ?? null),
    effort: str(r.effort_estimate),
    value: typeof r.value === 'number' ? r.value : null,
    risks: strList(r.risks),
    questions: strList(r.questions),
  };
}

/** Effort letter → meter width (T-shirt sizes are what the idea preset asks for). */
export function effortPercent(effort: string | null): number {
  const map: Record<string, number> = { XS: 12, S: 25, M: 50, L: 75, XL: 95 };
  return effort ? (map[effort.toUpperCase()] ?? 50) : 0;
}

export const SEVERITY_CLASS: Record<string, string> = {
  critical: 'rl-sev--crit',
  high: 'rl-sev--high',
  medium: 'rl-sev--med',
  low: 'rl-sev--low',
};
