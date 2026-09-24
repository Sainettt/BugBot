import Link from 'next/link';
import type { ReportCard } from '@bugbot/shared';
import type { Translate } from '@/i18n/translate';
import { fmtDateTime, fmtInt, fmtSeconds, fmtUsd, relTime } from '@/lib/format';
import { readResult } from '@/lib/result';
import { Callout } from '@/components/Callout';
import { JsonPane } from '@/components/JsonPane';
import { SeverityTag, StatusBadge } from '@/components/StatusBadge';
import styles from './reports.module.css';

const TABS = ['summary', 'json', 'email', 'original', 'runs'] as const;
type Tab = (typeof TABS)[number];

/**
 * The report card as Relay's third column (05-design-ui §4.2). Read-only in plan 01: the
 * actions are rendered where the design puts them but disabled until plan 04 writes them.
 */
export function ReportDrawer({
  card,
  t,
  lang,
  tab,
  closeHref,
  tabHref,
}: {
  card: ReportCard;
  t: Translate;
  lang: string;
  tab: string | undefined;
  closeHref: string;
  tabHref: (tab: Tab) => string;
}) {
  const active: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : 'summary';
  const run = card.currentRun;
  const result = readResult(run?.resultJson);
  const lastRun = card.runs[0];
  const soon = t('common.soon', { plan: '04' });
  const roles = card.reporter.roles.join(', ');

  return (
    <aside className="rl-drawer">
      <header className="rl-drawer__head">
        <div className="rl-spread" style={{ marginBottom: 10 }}>
          <div className="rl-row">
            <span className="rl-id rl-mono">{card.code}</span>
            {card.kind === 'BUG' && result.severity ? (
              <SeverityTag severity={result.severity} />
            ) : null}
            <StatusBadge
              status={card.analysisStatus}
              needsHuman={card.needsHuman}
              errorCode={lastRun?.error}
              t={t}
            />
          </div>
          <Link href={closeHref} className={styles.close} aria-label={t('common.close')}>
            ✕
          </Link>
        </div>
        <div className={styles.drawerTitle}>{card.title}</div>
        <div className={styles.drawerMeta}>
          {card.project.name}
          {card.reporter.name ? ` · ${card.reporter.name}` : ''}
          {roles ? ` · ${roles}` : ''} · {relTime(card.createdAt, t)}
        </div>
      </header>

      <div className={`rl-drawer__body ${styles.drawerBody}`}>
        <div className="rl-tabs" role="tablist">
          {TABS.map((name) => (
            <Link
              key={name}
              href={tabHref(name)}
              className="rl-tab"
              role="tab"
              aria-selected={name === active ? 'true' : 'false'}
            >
              {t(`drawer.tab.${name}`)}
            </Link>
          ))}
        </div>

        {active === 'summary' ? (
          <>
            {card.analysisStatus === 'NOT_SENT' ? (
              <>
                <Callout>{t('drawer.received')}</Callout>
                <div>
                  <button type="button" className="rl-btn rl-btn--primary" disabled title={soon}>
                    {t('drawer.sendToClaude')}
                  </button>
                </div>
                <Fields card={card} t={t} lang={lang} />
              </>
            ) : null}
            {card.analysisStatus === 'QUEUED' ? (
              <Callout tone="info">{t('drawer.queued')}</Callout>
            ) : null}
            {card.analysisStatus === 'RUNNING' ? (
              <Callout tone="info">{t('drawer.running')}</Callout>
            ) : null}
            {card.analysisStatus === 'FAILED' ? (
              <Callout tone="danger" title={t('drawer.failed')}>
                <span className="rl-mono">{lastRun?.error ?? lastRun?.status ?? '—'}</span>
              </Callout>
            ) : null}
            {card.analysisStatus === 'DONE' && run ? (
              <>
                {card.needsHuman ? (
                  <Callout tone="warn" title={t('status.needsHuman')}>
                    {result.questions.join(' ') || ' '}
                  </Callout>
                ) : null}
                <p className={styles.sum}>{result.summary ?? t('drawer.noSummary')}</p>
                <dl className="rl-kv">
                  {result.areas.length ? (
                    <>
                      <dt>{t('drawer.kv.areas')}</dt>
                      <dd className="rl-mono">{result.areas.join(', ')}</dd>
                    </>
                  ) : null}
                  {result.rootCause ? (
                    <>
                      <dt>{t('drawer.kv.cause')}</dt>
                      <dd>{result.rootCause}</dd>
                    </>
                  ) : null}
                  {result.firstStep ? (
                    <>
                      <dt>{t('drawer.kv.todo')}</dt>
                      <dd>{result.firstStep}</dd>
                    </>
                  ) : null}
                  {result.effort ? (
                    <>
                      <dt>{t('drawer.kv.effort')}</dt>
                      <dd className="rl-mono">{result.effort}</dd>
                    </>
                  ) : null}
                  {result.value !== null ? (
                    <>
                      <dt>{t('drawer.kv.value')}</dt>
                      <dd className="rl-mono">{result.value.toFixed(2)}</dd>
                    </>
                  ) : null}
                  {result.confidence !== null ? (
                    <>
                      <dt>{t('drawer.kv.confidence')}</dt>
                      <dd className="rl-mono">{result.confidence.toFixed(2)}</dd>
                    </>
                  ) : null}
                </dl>
                <div>
                  <div className={styles.codeBar}>
                    <span className={styles.eyebrow}>{t('drawer.result')}</span>
                    <span className="rl-row">
                      <span className={styles.usage}>
                        {t('usage.line', {
                          tokens: fmtInt(run.tokens),
                          seconds: fmtSeconds(run.durationMs),
                          model: run.model,
                        })}
                      </span>
                      <button
                        type="button"
                        className="rl-btn rl-btn--sm rl-btn--ghost"
                        disabled
                        title={soon}
                      >
                        {t('common.download')}
                      </button>
                    </span>
                  </div>
                  <JsonPane value={run.resultJson} maxHeight={260} />
                </div>
                <EmailCallout card={card} t={t} />
                <div className="rl-row" style={{ gap: 8 }}>
                  {card.kind === 'BUG' ? (
                    <>
                      <button
                        type="button"
                        className="rl-btn rl-btn--primary"
                        disabled
                        title={soon}
                      >
                        {t('drawer.actions.inProgress')}
                      </button>
                      <button type="button" className="rl-btn" disabled title={soon}>
                        {t('drawer.actions.forward')}
                      </button>
                      <button type="button" className="rl-btn rl-btn--quiet" disabled title={soon}>
                        {t('drawer.actions.duplicate')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="rl-btn rl-btn--primary"
                        disabled
                        title={soon}
                      >
                        {t('drawer.actions.backlog')}
                      </button>
                      <button type="button" className="rl-btn" disabled title={soon}>
                        {t('drawer.actions.postpone')}
                      </button>
                      <button type="button" className="rl-btn rl-btn--quiet" disabled title={soon}>
                        {t('drawer.actions.reject')}
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {active === 'json' ? <JsonPane value={run?.resultJson ?? null} maxHeight={720} /> : null}

        {active === 'email' ? (
          card.notifications.length === 0 ? (
            <div className="rl-empty">{t('drawer.email.none')}</div>
          ) : (
            <div>
              {card.notifications.map((n) => (
                <div key={n.id} className={styles.runItem}>
                  <div className="rl-row">
                    <span
                      className={`rl-badge ${n.status === 'SENT' ? 'rl-badge--ok' : n.status === 'FAILED' ? 'rl-badge--danger' : ''}`.trim()}
                    >
                      <i className="rl-badge__dot" />
                      {t(`notifStatus.${n.status}`)}
                    </span>
                    <span>{t(`notif.${n.kind}`)}</span>
                  </div>
                  <div className={styles.runMeta}>
                    {n.recipient}
                    {n.sentAt ? ` · ${fmtDateTime(n.sentAt, lang)}` : ''}
                    {n.error ? ` · ${n.error}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}

        {active === 'original' ? (
          <>
            <div>
              <div className={styles.eyebrow} style={{ marginBottom: 8 }}>
                {t('drawer.original.description')}
              </div>
              <p className={styles.sum}>{card.description}</p>
            </div>
            <Fields card={card} t={t} lang={lang} />
            <div>
              <div className={styles.eyebrow} style={{ marginBottom: 8 }}>
                {t('drawer.original.attachments')}
              </div>
              {card.attachments.length === 0 ? (
                <div className="rl-hint">{t('drawer.original.noAttachments')}</div>
              ) : (
                <div className="rl-stack" style={{ gap: 8 }}>
                  {card.attachments.map((a) => (
                    <div key={a.id} className="rl-file">
                      {a.fileName} · {a.mimeType} · {fmtInt(Math.round(a.sizeBytes / 1024))} KB
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}

        {active === 'runs' ? (
          <>
            {card.runs.length === 0 ? (
              <div className="rl-empty">{t('drawer.runs.none')}</div>
            ) : (
              <div>
                {card.runs.map((r) => (
                  <div key={r.id} className={styles.runItem}>
                    <div className="rl-row">
                      <span className="rl-mono">{r.model}</span>
                      <span className="rl-badge">{t(`runStatus.${r.status}`)}</span>
                      {r.promptVersion !== null ? (
                        <span className="rl-hint">v{r.promptVersion}</span>
                      ) : null}
                    </div>
                    <div className={styles.runMeta}>
                      {fmtInt(r.tokens)} tokens · {r.costUsd ? `$${fmtUsd(r.costUsd)}` : '—'} ·{' '}
                      {fmtSeconds(r.durationMs)} s · {fmtDateTime(r.startedAt, lang)}
                      {r.error ? ` · ${r.error}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div>
              <button type="button" className="rl-btn rl-btn--sm" disabled title={soon}>
                {t('drawer.runs.rerun')}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}

function Fields({ card, t, lang }: { card: ReportCard; t: Translate; lang: string }) {
  return (
    <dl className="rl-kv">
      <dt>{t('drawer.kv.reporter')}</dt>
      <dd>
        {card.reporter.name ?? '—'}
        {card.reporter.email ? <span className="rl-muted"> · {card.reporter.email}</span> : null}
      </dd>
      {card.reporter.roles.length ? (
        <>
          <dt>{t('drawer.kv.roles')}</dt>
          <dd className="rl-mono">{card.reporter.roles.join(', ')}</dd>
        </>
      ) : null}
      {card.fields.map((f) => (
        <FieldRow key={f.key} label={f.label} value={f.value} />
      ))}
      {card.locale ? (
        <>
          <dt>{t('drawer.kv.locale')}</dt>
          <dd className="rl-mono">{card.locale}</dd>
        </>
      ) : null}
      <dt>{t('drawer.kv.created')}</dt>
      <dd>{fmtDateTime(card.createdAt, lang)}</dd>
    </dl>
  );
}

function FieldRow({ label, value }: { label: string; value: string | string[] | boolean | null }) {
  const text =
    value === null
      ? '—'
      : Array.isArray(value)
        ? value.join(', ')
        : typeof value === 'boolean'
          ? value
            ? '✓'
            : '—'
          : value;
  return (
    <>
      <dt>{label}</dt>
      <dd className={styles.fieldValue}>{text}</dd>
    </>
  );
}

function EmailCallout({ card, t }: { card: ReportCard; t: Translate }) {
  const done = card.notifications.find((n) => n.kind === 'ANALYSIS_DONE');
  if (!done) return null;
  if (done.status === 'SENT') {
    return (
      <Callout tone="ok" title={t('drawer.email.sent')}>
        {done.recipient}
        {done.sentAt ? ` · ${relTime(done.sentAt, t)}` : ''}
      </Callout>
    );
  }
  if (done.status === 'FAILED') {
    return (
      <Callout tone="danger" title={t('drawer.email.failed')}>
        {done.recipient}
        {done.error ? ` · ${done.error}` : ''}
      </Callout>
    );
  }
  return <Callout title={t('drawer.email.pending')}>{done.recipient}</Callout>;
}
