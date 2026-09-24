'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';
import type { TKey } from '@/i18n/dictionaries';

interface Item {
  href: string;
  label: TKey;
  count?: number;
  /** `/admin` is also the Reports page's own route; match it exactly, others by prefix. */
  exact?: boolean;
}

/** Flow (Reports, Ideas) + System (Projects, Runs, Settings); counts are `triageStatus = NEW`. */
export function Nav({ counts }: { counts: { bugs: number; ideas: number } }) {
  const t = useT();
  const pathname = usePathname();
  const flow: Item[] = [
    { href: '/admin', label: 'nav.reports', count: counts.bugs, exact: true },
    { href: '/admin/ideas', label: 'nav.ideas', count: counts.ideas },
  ];
  const system: Item[] = [
    { href: '/admin/projects', label: 'nav.projects' },
    { href: '/admin/runs', label: 'nav.runs' },
    { href: '/admin/settings', label: 'nav.settings' },
  ];
  const isCurrent = (item: Item): boolean =>
    item.exact
      ? pathname === item.href || pathname === '/admin/reports'
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const render = (item: Item) => (
    <Link key={item.href} href={item.href} aria-current={isCurrent(item) ? 'page' : undefined}>
      {t(item.label)}
      {item.count ? <span className="rl-nav__count">{item.count}</span> : null}
    </Link>
  );

  return (
    <nav className="rl-nav">
      <div className="rl-nav__group">{t('nav.flow')}</div>
      {flow.map(render)}
      <div className="rl-nav__group">{t('nav.system')}</div>
      {system.map(render)}
    </nav>
  );
}
