import type { ReactNode } from 'react';
import { getT, getTheme } from '@/i18n/server';
import { getDashboard } from '@/lib/api';
import { LangSwitch } from './LangSwitch';
import { ThemeSwitch } from './ThemeSwitch';
import styles from './shell.module.css';

/**
 * Relay top bar: page title, one state badge (the queue — the worker itself arrives in plan 04),
 * at most one action, and the two switches. Filters never go here (05-design-ui §4.1).
 * The dashboard fetch is memoised per request, so the layout's call and this one cost one HTTP call.
 */
export async function Topbar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const [t, theme, dash] = await Promise.all([getT(), getTheme(), getDashboard('all')]);
  return (
    <header className="rl-topbar">
      <div>
        <h1 className="rl-h1">{title}</h1>
        {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
      </div>
      <div className="rl-row">
        {action}
        {dash.running > 0 ? (
          <span className="rl-badge rl-badge--accent">
            <i className="rl-badge__dot" />
            {t('topbar.analysing', { n: dash.running })}
          </span>
        ) : (
          <span className="rl-badge">
            <i className="rl-badge__dot" />
            {t('topbar.queued', { n: dash.queued })}
          </span>
        )}
        <LangSwitch />
        <ThemeSwitch initial={theme} />
      </div>
    </header>
  );
}
