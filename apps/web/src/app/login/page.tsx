import { redirect } from 'next/navigation';
import type { TKey } from '@/i18n/dictionaries';
import { getT } from '@/i18n/server';
import { getMe } from '@/lib/api';
import { Callout } from '@/components/Callout';
import { Mark } from '@/components/icons';
import styles from './login.module.css';

/** The API redirects here with ?error=… when a sign-in attempt is refused. */
const ERRORS: Record<string, TKey> = {
  not_allowed: 'login.error.not_allowed',
  invalid_state: 'login.error.invalid_state',
  google_error: 'login.error.google_error',
  not_configured: 'login.error.not_configured',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [t, me, { error }] = await Promise.all([getT(), getMe(), searchParams]);
  if (me) redirect('/admin');
  const errorKey = error ? ERRORS[error] : undefined;

  return (
    <main className={`${styles.page} rl-grid-bg`}>
      <section className={`rl-panel rl-panel--raised ${styles.card}`}>
        <span className="rl-mark">
          <Mark />
          <b>{t('app.name')}</b>
        </span>
        <div className={styles.eyebrow}>{t('login.eyebrow')}</div>
        <h1 className={styles.title}>{t('login.title')}</h1>
        <p className={styles.subtitle}>{t('login.subtitle')}</p>
        {errorKey ? <Callout tone="danger">{t(errorKey)}</Callout> : null}
        {/* Same-origin so the session cookie the callback sets belongs to the web app. */}
        <a href="/api/auth/google" className="rl-btn rl-btn--primary rl-btn--lg rl-btn--block">
          {t('login.button')}
        </a>
      </section>
    </main>
  );
}
