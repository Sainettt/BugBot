/** Cabinet UI language: English default, Polish beside it (decision 2026-09-22). */
export const LANGS = ['en', 'pl'] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = 'en';
export const LANG_COOKIE = 'lang';

/** Theme lives in a cookie so server components render the right one — no flash, no script. */
export const THEME_COOKIE = 'theme';
export type Theme = 'dark' | 'light';
export const DEFAULT_THEME: Theme = 'dark';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}
