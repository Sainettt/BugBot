import { cookies } from 'next/headers';
import {
  DEFAULT_LANG,
  DEFAULT_THEME,
  LANG_COOKIE,
  THEME_COOKIE,
  type Lang,
  type Theme,
  isLang,
  isTheme,
} from './config';
import { type Translate, makeT } from './translate';

/** Current UI language for server components — the cookie the language switch writes. */
export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

/** `const t = await getT()` in any server component. */
export async function getT(): Promise<Translate> {
  return makeT(await getLang());
}

export async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}
