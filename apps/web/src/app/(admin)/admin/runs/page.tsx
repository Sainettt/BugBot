import Link from 'next/link';
import type { DashboardPeriod } from '@bugbot/shared';
import { getLang, getT } from '@/i18n/server';
import { getProjects, getRuns } from '@/lib/api';
import { firstValues, fmtDateTime, fmtInt, fmtSeconds, fmtUsd, withParams } from '@/lib/format';
import { Topbar } from '@/components/Topbar';
import styles from '../reports.module.css';

const PERIODS: DashboardPeriod[] = ['24h', '7d', 'all'];
const STATUSES = ['RUNNING', 'DONE', 'FAILED', 'TIMEOUT', 'CANCELLED'];
const PAGE = 30;

/** Runs: the `AgentRun` journal (05-design-ui §4.5). A row opens the report drawer on its Runs tab. */
export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = firstValues(await searchParams);
  const period: DashboardPeriod = PERIODS.includes(sp.period as DashboardPeriod)
    ? (sp.period as DashboardPeriod)
    : 'all';
  const status = STATUSES.includes(sp.status ?? '') ? sp.status : undefined;
  const [t, lang, projects, page] = await Promise.all([
    getT(),
    getLang(),
    getProjects(),
    getRuns({
      project: sp.project,
      status,
      model: sp.model,
      period,
      cursor: sp.cursor,
      limit: PAGE,
    }),
  ]);
  const current = {
    period: sp.period,
    project: sp.project,
    status,
    model: sp.model,
    cursor: sp.cursor,
  };
  const models = [...new Set(page.items.map((r) => r.model))].sort();

  return (
    <main className="rl-main">
      <Topbar title={t('runs.title')} />
      <div className="rl-content">
        <form method="get" action="/admin/runs" className={styles.filters}>
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
          <select
            className={`rl-select ${styles.select}`}
            name="status"
            defaultValue={status ?? ''}
          >
            <option value="">{t('filters.allStatuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`runStatus.${s as 'DONE'}`)}
              </option>
            ))}
          </select>
          <select
            className={`rl-select ${styles.select}`}
            name="model"
            defaultValue={sp.model ?? ''}
          >
            <option value="">{t('runs.allModels')}</option>
            {[...new Set([...models, ...(sp.model ? [sp.model] : [])])].map((m) => (
              <option key={m} value={m}>
                {m}
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
          <Link href="/admin/runs" className="rl-btn rl-btn--sm rl-btn--quiet">
            {t('common.reset')}
          </Link>
        </form>

        <section className="rl-panel">
          <div className="rl-panel__body rl-panel__body--flush">
            {page.items.length === 0 ? (
              <div className="rl-empty">{t('runs.empty')}</div>
            ) : (
              <table className="rl-table">
                <thead>
                  <tr>
                    <th>{t('runs.table.time')}</th>
                    <th>{t('runs.table.project')}</th>
                    <th>{t('runs.table.report')}</th>
                    <th>{t('runs.table.kind')}</th>
                    <th>{t('runs.table.model')}</th>
                    <th>{t('runs.table.prompt')}</th>
                    <th>{t('runs.table.status')}</th>
                    <th className="is-right">{t('runs.table.turns')}</th>
                    <th className="is-right">{t('runs.table.tokens')}</th>
                    <th className="is-right">{t('runs.table.cost')}</th>
                    <th className="is-right">{t('runs.table.duration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((r) => (
                    <tr key={r.id} className={`is-link ${styles.row}`}>
                      <td className="rl-dim">{fmtDateTime(r.startedAt, lang)}</td>
                      <td>{r.projectName}</td>
                      <td className={styles.ttl}>
                        <Link href={`/admin?report=${r.reportId}&tab=runs`} className="rl-id">
                          {r.reportCode}
                        </Link>
                      </td>
                      <td className="rl-dim">{t(`kind.${r.kind}`)}</td>
                      <td className="rl-mono">{r.model}</td>
                      <td className="rl-mono">
                        {r.promptVersion !== null ? `v${r.promptVersion}` : '—'}
                      </td>
                      <td>
                        <span
                          className={`rl-badge ${r.status === 'DONE' ? 'rl-badge--ok' : r.status === 'RUNNING' ? 'rl-badge--accent' : r.status === 'FAILED' || r.status === 'TIMEOUT' ? 'rl-badge--danger' : ''}`.trim()}
                        >
                          <i className="rl-badge__dot" />
                          {t(`runStatus.${r.status}`)}
                          {r.error ? (
                            <>
                              {' · '}
                              <span className="rl-mono">{r.error}</span>
                            </>
                          ) : null}
                        </span>
                      </td>
                      <td className="rl-num">{r.numTurns ?? '—'}</td>
                      <td className="rl-num">{fmtInt(r.tokens)}</td>
                      <td className="rl-num">{r.costUsd ? fmtUsd(r.costUsd) : '—'}</td>
                      <td className="rl-num">
                        {r.durationMs !== null ? `${fmtSeconds(r.durationMs)} s` : '—'}
                      </td>
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
  );
}
