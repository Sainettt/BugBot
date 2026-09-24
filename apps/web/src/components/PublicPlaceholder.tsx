import { getT } from '@/i18n/server';
import type { TKey } from '@/i18n/dictionaries';
import { Callout } from './Callout';
import { Mark } from './icons';

/**
 * Placeholder for the project pages (`/p/<slug>/alarm`, `/ideas`, `/auth/callback`) so the URL
 * structure and the proxy config exist from plan 01; the forms and the handoff arrive in plan 02.
 */
export async function PublicPlaceholder({ slug, titleKey }: { slug: string; titleKey: TKey }) {
  const t = await getT();
  return (
    <main
      className="rl-grid-bg"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-6)',
      }}
    >
      <section
        className="rl-panel rl-panel--raised"
        style={{ width: '100%', maxWidth: 'var(--form-max)', padding: 'var(--space-6)' }}
      >
        <div className="rl-stack">
          <span className="rl-mark">
            <Mark />
            <b>{t('app.name')}</b>
          </span>
          <div
            className="rl-eyebrow"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '.12em',
              color: 'var(--accent-100)',
            }}
          >
            {t('public.eyebrow', { project: slug })}
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 40,
              lineHeight: '44px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            {t(titleKey)}
          </h1>
          <Callout>{t('public.placeholder')}</Callout>
        </div>
      </section>
    </main>
  );
}
