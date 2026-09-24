import { type TKey, dictionaries } from './dictionaries';
import type { Lang } from './config';

export type Vars = Record<string, string | number>;
export type Translate = (key: TKey, vars?: Vars) => string;

/** `{name}` placeholders are filled from `vars`; anything unmatched stays visible on purpose. */
export function makeT(lang: Lang): Translate {
  const dict = dictionaries[lang];
  return (key, vars) => {
    const text: string = dict[key];
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in vars ? String(vars[name]) : whole,
    );
  };
}
