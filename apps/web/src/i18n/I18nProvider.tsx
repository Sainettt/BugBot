'use client';

import { type ReactNode, createContext, useContext, useMemo } from 'react';
import { DEFAULT_LANG, type Lang } from './config';
import { type Translate, makeT } from './translate';

const LangContext = createContext<Lang>(DEFAULT_LANG);

/** The language comes from the cookie, resolved once on the server (see i18n/server.ts). */
export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** `const t = useT()` in any client component. */
export function useT(): Translate {
  const lang = useLang();
  return useMemo(() => makeT(lang), [lang]);
}
