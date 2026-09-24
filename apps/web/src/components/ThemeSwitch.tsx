'use client';

import { useState } from 'react';
import { THEME_COOKIE, type Theme } from '@/i18n/config';
import { useT } from '@/i18n/I18nProvider';
import { MoonIcon, SunIcon } from './icons';

/**
 * Dark is the default (05-design-ui §6). The attribute flips at once for the current page; the
 * cookie makes the server render the same theme next time, so there is no flash and no script.
 */
export function ThemeSwitch({ initial }: { initial: Theme }) {
  const t = useT();
  const [theme, setTheme] = useState<Theme>(initial);

  function toggle(): void {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      className="rl-btn rl-btn--sm rl-btn--ghost"
      onClick={toggle}
      title={t('topbar.theme')}
      aria-label={t('topbar.theme')}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
