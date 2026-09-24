'use client';

import { useRouter } from 'next/navigation';
import { LANGS, LANG_COOKIE, type Lang } from '@/i18n/config';
import { useLang, useT } from '@/i18n/I18nProvider';

/**
 * Cycles EN → PL → EN. The language lives in a cookie so server components render in it too;
 * `router.refresh()` re-renders them without a full page load.
 */
export function LangSwitch() {
  const router = useRouter();
  const lang = useLang();
  const t = useT();
  const next: Lang = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length] ?? 'en';

  return (
    <button
      type="button"
      className="rl-btn rl-btn--sm rl-btn--ghost rl-mono"
      title={t('topbar.language')}
      aria-label={t('topbar.language')}
      onClick={() => {
        // 1 year, root path — a plain preference, nothing sensitive.
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
    >
      {lang.toUpperCase()}
    </button>
  );
}
