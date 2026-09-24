import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { getDashboard, getMe } from '@/lib/api';

/**
 * The gate for every cabinet screen. Pages render their own `rl-main` (top bar + content) and,
 * for Reports, the `rl-drawer` as a third column — so the layout is only the shell + sidebar.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect('/login');
  const dash = await getDashboard('all');

  return (
    <div className="rl-shell">
      <Sidebar owner={me} counts={{ bugs: dash.newBugs, ideas: dash.newIdeas }} />
      {children}
    </div>
  );
}
