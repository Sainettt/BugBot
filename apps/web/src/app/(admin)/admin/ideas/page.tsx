import Link from 'next/link';
import type { ReportListItem } from '@bugbot/shared';
import { getT } from '@/i18n/server';
import { getReport, getReports } from '@/lib/api';
import { firstValues, fmtInt, fmtSeconds, initials, relTime, withParams } from '@/lib/format';
import { effortPercent, readResult } from '@/lib/result';
import { Callout } from '@/components/Callout';
import { Topbar } from '@/components/Topbar';
import styles from './ideas.module.css';

const FILTERS = ['new', 'backlog', 'all'] as const;
type Filter = (typeof FILTERS)[number];

function matches(filter: Filter, r: ReportListItem): boolean {
  if (filter === 'new') return r.triageStatus === 'NEW';
  if (filter === 'backlog') return r.triageStatus === 'IN_PROGRESS';
  return true;
}

/** Ideas: the card feed and the sticky analysis panel (05-design-ui §4.3). Read-only in plan 01. */
export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = firstValues(await searchParams);
  const filter: Filter = FILTERS.includes(sp.filter as Filter) ? (sp.filter as Filter) : 'new';
  const [t, page] = await Promise.all([
    getT(),
    getReports({ kind: 'IDEA', period: 'all', limit: 100 }),
  ]);
  const ideas = page.items.filter((r) => matches(filter, r));
  const selectedId = sp.idea ?? ideas[0]?.id;
  const card = selectedId ? await getReport(selectedId) : null;
  const result = readResult(card?.currentRun?.resultJson);
  const current = { filter: sp.filter, idea: sp.idea };
  const soon = t('common.soon', { plan: '04' });

  return (
    <main className="rl-main">
      <Topbar
        title={t('ideas.title')}
        subtitle={t('ideas.subtitle')}
        action={
          <div className="rl-seg" role="group" aria-label="Filter">
            {FILTERS.map((f) => (
              <Link
                key={f}
                href={withParams(current, { filter: f, idea: undefined })}
                aria-current={f === filter ? 'true' : undefined}
              >
                {t(`ideas.filter.${f}`)}
              </Link>
            ))}
          </div>
        }
      />
      <div className="rl-content">
        <div className={styles.cols}>
          <div className={styles.feed}>
            {ideas.length === 0 ? <div className="rl-empty">{t('ideas.empty')}</div> : null}
            {ideas.map((r) => (
              <article
                key={r.id}
                className={`rl-panel ${styles.idea} ${r.triageStatus !== 'NEW' ? styles.read : ''}`.trim()}
                aria-current={r.id === selectedId ? 'true' : undefined}
              >
                <div className={styles.meta}>
                  <span className={styles.avatar}>{initials(r.reporterName, r.code)}</span>
                  <span>
                    {r.reporterName ?? '—'}
                    {r.reporterRoles.length ? ` · ${r.reporterRoles.join(', ')}` : ''}
                  </span>
                  <span>·</span>
                  <span>{r.projectName}</span>
                  <span>·</span>
                  <span>{relTime(r.createdAt, t)}</span>
                  <span className="rl-id rl-mono">{r.code}</span>
                </div>
                <h3 className={styles.title}>
                  <Link href={withParams(current, { idea: r.id })}>{r.title}</Link>
                </h3>
                <div className={styles.tags}>
                  {r.analysisStatus === 'DONE' && !r.needsHuman ? (
                    <span className="rl-badge rl-badge--accent">
                      <i className="rl-badge__dot" />
                      {t('ideas.tag.analysed')}
                    </span>
                  ) : r.analysisStatus === 'DONE' ? (
                    <span className="rl-badge rl-badge--warn">
                      <i className="rl-badge__dot" />
                      {t('ideas.tag.needsDetails')}
                    </span>
                  ) : (
                    <span className="rl-badge">
                      <i className="rl-badge__dot" />
                      {t(`status.${r.analysisStatus}`)}
                    </span>
                  )}
                  {r.triageStatus === 'IN_PROGRESS' ? (
                    <span className="rl-badge rl-badge--ok">{t('ideas.filter.backlog')}</span>
                  ) : null}
                </div>
                <div className={styles.acts}>
                  <span className="rl-hint">
                    {r.currentRun ? `${fmtInt(r.currentRun.tokens)} tokens` : ' '}
                  </span>
                  <div className="rl-row">
                    <button
                      type="button"
                      className="rl-btn rl-btn--sm rl-btn--quiet"
                      disabled
                      title={soon}
                    >
                      {t('drawer.actions.postpone')}
                    </button>
                    <Link href={withParams(current, { idea: r.id })} className="rl-btn rl-btn--sm">
                      {t('ideas.openAnalysis')}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.side}>
            <section className="rl-panel rl-panel--raised">
              <header className="rl-panel__head">
                <h3 className="rl-panel__title">{t('ideas.analysis')}</h3>
                {card ? <span className="rl-mono rl-hint">{card.code}</span> : null}
              </header>
              <div className={`rl-panel__body ${styles.panelBody}`}>
                {!card ? <div className="rl-hint">{t('ideas.pickOne')}</div> : null}
                {card && !card.currentRun ? (
                  <>
                    <p className={styles.sum}>{card.description}</p>
                    <div className="rl-hint">{t('ideas.notAnalysed')}</div>
                  </>
                ) : null}
                {card && card.currentRun ? (
                  <>
                    <p className={styles.sum}>{result.summary ?? card.description}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className={styles.scale}>
                        <span>{t('ideas.value')}</span>
                        <span className="rl-meter">
                          <i style={{ width: `${Math.round((result.value ?? 0) * 100)}%` }} />
                        </span>
                        <span className={styles.scaleValue}>
                          {result.value !== null ? result.value.toFixed(2) : '—'}
                        </span>
                      </div>
                      <div className={styles.scale}>
                        <span>{t('ideas.effort')}</span>
                        <span className="rl-meter rl-meter--warn">
                          <i style={{ width: `${effortPercent(result.effort)}%` }} />
                        </span>
                        <span className={styles.scaleValue}>{result.effort ?? '—'}</span>
                      </div>
                    </div>
                    <dl className="rl-kv">
                      <dt>{t('ideas.kv.areas')}</dt>
                      <dd>{result.areas.length ? result.areas.join(', ') : '—'}</dd>
                      <dt>{t('ideas.kv.run')}</dt>
                      <dd className="rl-mono">
                        {fmtInt(card.currentRun.tokens)} · {fmtSeconds(card.currentRun.durationMs)}{' '}
                        s · {card.currentRun.model}
                      </dd>
                    </dl>
                    <div className="rl-row" style={{ gap: 8 }}>
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
                    </div>
                  </>
                ) : null}
              </div>
            </section>
            <Callout>{t('ideas.callout')}</Callout>
          </div>
        </div>
      </div>
    </main>
  );
}
