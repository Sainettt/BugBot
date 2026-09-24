import { getLang, getT } from '@/i18n/server';
import { getSettings } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { Topbar } from '@/components/Topbar';

/** Settings: the `AppSetting` rows, read-only until plan 02. */
export default async function SettingsPage() {
  const [t, lang, settings] = await Promise.all([getT(), getLang(), getSettings()]);
  return (
    <main className="rl-main">
      <Topbar
        title={t('settings.title')}
        action={<span className="rl-hint">{t('settings.readOnly')}</span>}
      />
      <div className="rl-content">
        <section className="rl-panel">
          <div className="rl-panel__body rl-panel__body--flush">
            <table className="rl-table">
              <thead>
                <tr>
                  <th>{t('settings.key')}</th>
                  <th>{t('settings.value')}</th>
                  <th>{t('settings.updated')}</th>
                  <th>{t('settings.by')}</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((s) => (
                  <tr key={s.key}>
                    <td className="rl-mono">{s.key}</td>
                    <td className="rl-mono">
                      {typeof s.value === 'string' ? s.value : JSON.stringify(s.value)}
                    </td>
                    <td className="rl-dim">{fmtDateTime(s.updatedAt, lang)}</td>
                    <td className="rl-dim">{s.updatedBy ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
