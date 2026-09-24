import Link from 'next/link';
import type { DashboardPeriod } from '@bugbot/shared';
import { getLang, getT } from '@/i18n/server';
import { getDashboard, getProjects, getReport, getReports } from '@/lib/api';
import { firstValues, fmtInt, fmtUsd, relTime, withParams } from '@/lib/format';
import { Topbar } from '@/components/Topbar';
import { SearchIcon } from '@/components/icons';
import { SeverityTag, StatusBadge } from '@/components/StatusBadge';
import { ReportDrawer } from './ReportDrawer';
import styles from './reports.module.css';

const PERIODS: DashboardPeriod[] = ['24h', '7d', 'all'];
const KINDS = ['BUG', 'IDEA'];
const STATUSES = ['NOT_SENT', 'QUEUED', 'RUNNING', 'DONE', 'FAILED'];
const PAGE = 20;

type Params = Record<string, string | string[] | undefined>;

/** Reports: four tiles, filters, the cross-project feed and the drawer (05-design-ui §4.2). */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = firstValues(await searchParams);
  const period: DashboardPeriod = PERIODS.includes(sp.period as DashboardPeriod)
    ? (sp.period as DashboardPeriod)
    : '24h';
  const kind = KINDS.includes(sp.kind ?? '') ? sp.kind : undefined;
  const status = STATUSES.includes(sp.status ?? '') ? sp.status : undefined;

  const [t, lang, dash, projects, page, card] = await Promise.all([
    getT(),
    getLang(),
    getDashboard(period),
    getProjects(),
    getReports({
      project: sp.project,
      kind,
      status,
      period,
      q: sp.q,
      cursor: sp.cursor,
      limit: PAGE,
    }),
    sp.report ? getReport(sp.report) : Promise.resolve(null),
  ]);

  const current = {
    period: sp.period,
    project: sp.project,
    kind,
    status,
    q: sp.q,
    cursor: sp.cursor,
    report: sp.report,
    tab: sp.tab,
  };
  const withoutHuman =
    dash.analysed > 0
      ? Math.round(((dash.analysed - dash.needsHuman) / dash.analysed) * 100)
      : null;
  const periodLabel = t(`period.${period}`);

  return (
    <>
      <main className="rl-main">
        <Topbar title={t('reports.title')} />
        <div className="rl-content">
          <div className={styles.stats}>
            <div className="rl-stat">
              <div className="rl-stat__label">
                {t('reports.tile.reports', { period: periodLabel })}
              </div>
              <div className="rl-stat__value">{fmtInt(dash.reports)}</div>
              <div className="rl-stat__note">
                {period === 'all'
                  ? ' '
                  : t('reports.tile.reportsNote', { n: fmtInt(dash.reportsPrev) })}
              </div>
            </div>
            <div className="rl-stat rl-stat--accent">
              <div className="rl-stat__label">{t('reports.tile.analysed')}</div>
              <div className="rl-stat__value">{fmtInt(dash.analysed)}</div>
              <div className="rl-stat__note">
                {withoutHuman === null
                  ? t('reports.tile.analysedNone')
                  : t('reports.tile.analysedNote', { pct: withoutHuman })}
              </div>
            </div>
            <div className={`rl-stat ${dash.failed > 0 ? 'rl-stat--danger' : ''}`.trim()}>
              <div className="rl-stat__label">{t('reports.tile.failed')}</div>
              <div className="rl-stat__value">{fmtInt(dash.failed)}</div>
              <div className="rl-stat__note">
                {dash.failedTopError ? (
                  <>
                    {t('reports.tile.failedNote', { code: '' })}
                    <span className="rl-mono">{dash.failedTopError}</span>
                  </>
                ) : (
                  t('reports.tile.failedNone')
                )}
              </div>
            </div>
            <div className="rl-stat">
              <div className="rl-stat__label">
                {t('reports.tile.tokens', { period: periodLabel })}
              </div>
              <div className="rl-stat__value">{fmtInt(dash.tokens)}</div>
              <div className="rl-stat__note">
                {t('reports.tile.tokensNote', { cost: fmtUsd(dash.costUsd) })}
              </div>
            </div>
          </div>

          <form method="get" action="/admin" className={styles.filters}>
            <div className={styles.search}>
              <SearchIcon />
              <input
                className="rl-input"
                name="q"
                defaultValue={sp.q ?? ''}
                placeholder={t('filters.search')}
              />
            </div>
            <select
              className={`rl-select ${styles.select}`}
              name="project"
              defaultValue={sp.project ?? ''}
            >
              <option value="">{t('filters.allProjects')}</option>
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
            <select className={`rl-select ${styles.select}`} name="kind" defaultValue={kind ?? ''}>
              <option value="">{t('filters.allKinds')}</option>
              <option value="BUG">{t('filters.bugs')}</option>
              <option value="IDEA">{t('filters.ideas')}</option>
            </select>
            <select
              className={`rl-select ${styles.select}`}
              name="status"
              defaultValue={status ?? ''}
            >
              <option value="">{t('filters.allStatuses')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s as 'NOT_SENT'}`)}
                </option>
              ))}
            </select>
            {sp.period ? <input type="hidden" name="period" value={sp.period} /> : null}
            <div className="rl-seg" role="group" aria-label="Period">
              {PERIODS.map((p) => (
                <Link
                  key={p}
                  href={withParams(current, { period: p, cursor: undefined })}
                  aria-current={p === period ? 'true' : undefined}
                >
                  {t(`period.${p}`)}
                </Link>
              ))}
            </div>
            <button type="submit" className="rl-btn rl-btn--sm">
              {t('filters.apply')}
            </button>
            <Link href="/admin" className="rl-btn rl-btn--sm rl-btn--quiet">
              {t('common.reset')}
            </Link>
          </form>

          <section className="rl-panel">
            <div className="rl-panel__body rl-panel__body--flush">
              {page.items.length === 0 ? (
                <div className="rl-empty">{t('table.empty')}</div>
              ) : (
                <table className="rl-table">
                  <thead>
                    <tr>
                      <th>{t('table.report')}</th>
                      <th>{t('table.severity')}</th>
                      <th>{t('table.status')}</th>
                      <th className="is-right">{t('table.tokens')}</th>
                      <th className="is-right">{t('table.time')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.items.map((r) => (
                      <tr
                        key={r.id}
                        className={`is-link ${styles.row}`}
                        aria-selected={r.id === sp.report ? 'true' : undefined}
                      >
                        <td>
                          <div className={styles.ttl}>
                            <Link href={withParams(current, { report: r.id, tab: undefined })}>
                              {r.title}
                            </Link>
                          </div>
                          <div className={styles.sub}>
                            <span className="rl-id">{r.code}</span> · {r.projectName}
                            {r.reporterName ? ` · ${r.reporterName}` : ''}
                            {r.kind === 'IDEA' ? ` · ${t('kind.IDEA')}` : ''}
                          </div>
                        </td>
                        <td>
                          <SeverityTag severity={r.severity} />
                        </td>
                        <td>
                          <StatusBadge status={r.analysisStatus} needsHuman={r.needsHuman} t={t} />
                        </td>
                        <td className="rl-num">
                          {r.currentRun ? fmtInt(r.currentRun.tokens) : '—'}
                        </td>
                        <td className="rl-num">{relTime(r.createdAt, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <footer className="rl-panel__foot">
              <span className="rl-hint">{t('table.showing', { n: page.items.length })}</span>
              <div className="rl-row">
                {sp.cursor ? (
                  <Link
                    href={withParams(current, { cursor: undefined })}
                    className="rl-btn rl-btn--sm rl-btn--ghost"
                  >
                    {t('common.back')}
                  </Link>
                ) : null}
                {page.nextCursor ? (
                  <Link
                    href={withParams(current, { cursor: page.nextCursor })}
                    className="rl-btn rl-btn--sm rl-btn--ghost"
                  >
                    {t('common.next')}
                  </Link>
                ) : null}
              </div>
            </footer>
          </section>
        </div>
      </main>

      {card ? (
        <ReportDrawer
          card={card}
          t={t}
          lang={lang}
          tab={sp.tab}
          closeHref={withParams(current, { report: undefined, tab: undefined })}
          tabHref={(tab) => withParams(current, { tab })}
        />
      ) : null}
    </>
  );
}
