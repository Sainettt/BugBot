'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';

/** POST /auth/logout through the same-origin /api proxy, then back to the login page. */
export function SignOutButton() {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="rl-btn rl-btn--sm rl-btn--quiet"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
          router.replace('/login');
          router.refresh();
        }
      }}
    >
      {t('owner.signOut')}
    </button>
  );
}
