import type { AuthMe } from '@bugbot/shared';
import { getT } from '@/i18n/server';
import { initials } from '@/lib/format';
import { Mark } from './icons';
import { Nav } from './Nav';
import { SignOutButton } from './SignOutButton';
import styles from './shell.module.css';

/** Relay AppShell sidebar: mark, two nav groups, the owner card at the bottom (05-design-ui §4.1). */
export async function Sidebar({
  owner,
  counts,
}: {
  owner: AuthMe;
  counts: { bugs: number; ideas: number };
}) {
  const t = await getT();
  return (
    <aside className="rl-side">
      <span className="rl-mark">
        <Mark />
        <b>{t('app.name')}</b>
      </span>
      <Nav counts={counts} />
      <div className={styles.who}>
        <i className={styles.avatar}>{initials(owner.name, owner.email)}</i>
        <div className={styles.whoText}>
          <div className={styles.whoName}>{owner.name?.trim() || owner.email}</div>
          <div className={styles.whoRole}>{t('owner.role')}</div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
