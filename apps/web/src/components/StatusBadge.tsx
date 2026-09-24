import type { AnalysisStatus } from '@bugbot/shared';
import type { Translate } from '@/i18n/translate';

const CLASS: Record<AnalysisStatus, string> = {
  NOT_SENT: '',
  QUEUED: 'rl-badge--info',
  RUNNING: 'rl-badge--accent',
  DONE: 'rl-badge--ok',
  FAILED: 'rl-badge--danger',
};

/**
 * Relay's six badges over BugBot's status + the derived "needs a human" flag (05-design-ui §3).
 * Status always carries a word; colour is secondary. The failure code follows a dot, monospace.
 */
export function StatusBadge({
  status,
  needsHuman,
  errorCode,
  t,
}: {
  status: AnalysisStatus;
  needsHuman?: boolean;
  errorCode?: string | null;
  t: Translate;
}) {
  const warn = status === 'DONE' && needsHuman;
  const cls = warn ? 'rl-badge--warn' : CLASS[status];
  return (
    <span className={`rl-badge ${cls}`.trim()}>
      <i className="rl-badge__dot" />
      {warn ? t('status.needsHuman') : t(`status.${status}`)}
      {status === 'FAILED' && errorCode ? (
        <>
          {' · '}
          <span className="rl-mono">{errorCode}</span>
        </>
      ) : null}
    </span>
  );
}

export function SeverityTag({ severity }: { severity: string | null }) {
  if (!severity) return <span className="rl-muted">—</span>;
  const cls =
    { critical: 'rl-sev--crit', high: 'rl-sev--high', medium: 'rl-sev--med', low: 'rl-sev--low' }[
      severity
    ] ?? '';
  return <span className={`rl-sev ${cls}`.trim()}>{severity}</span>;
}
