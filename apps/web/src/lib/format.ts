import type { Translate } from '@/i18n/translate';

/** Thin-space digit grouping for monospace numbers: 18 420 (brand book: numbers never jump). */
export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Decimal string from the API → "0.41"; null → "—". Never parses to float for math. */
export function fmtUsd(value: string | null | undefined, digits = 2): string {
  if (!value) return '—';
  const [int = '0', frac = ''] = value.split('.');
  return `${int}.${(frac + '00').slice(0, digits)}`;
}

export function fmtSeconds(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return (ms / 1000).toFixed(1);
}

/** Relative age in the cabinet's coarse steps (mockup: "12 мин", "2 ч"). */
export function relTime(iso: string, t: Translate, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutes', { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 48) return t('time.hours', { n: hours });
  return t('time.days', { n: Math.round(hours / 24) });
}

export function fmtDateTime(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'pl' ? 'pl-PL' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

/** Two-letter initials for the owner card. */
export function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
  return (first + second).toUpperCase();
}

/** Keep the current filters while changing one key; `undefined` removes a key. */
export function withParams(
  current: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** `searchParams` from Next as a flat string map (first value wins). */
export function firstValues(
  params: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(params)) out[k] = Array.isArray(v) ? v[0] : v;
  return out;
}
