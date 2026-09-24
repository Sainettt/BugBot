import type { DashboardPeriod } from '@bugbot/shared';

const HOUR = 60 * 60 * 1000;
const LENGTH: Record<Exclude<DashboardPeriod, 'all'>, number> = {
  '24h': 24 * HOUR,
  '7d': 7 * 24 * HOUR,
};

/** Lower bounds of the period and of the previous period of the same length; nulls for `all`. */
export function periodBounds(
  period: DashboardPeriod,
  now = new Date(),
): { since: Date | null; prevSince: Date | null } {
  if (period === 'all') return { since: null, prevSince: null };
  const len = LENGTH[period];
  return { since: new Date(now.getTime() - len), prevSince: new Date(now.getTime() - 2 * len) };
}
