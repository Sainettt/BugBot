import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  FormConfigSchema,
  HandoffJwtAuthConfigSchema,
  LimitsSchema,
  NotificationConfigSchema,
  type ProjectDetail,
} from '@bugbot/shared';
import { getT } from '@/i18n/server';
import type { Translate } from '@/i18n/translate';
import { getProject, getProjects } from '@/lib/api';
import { firstValues, fmtInt } from '@/lib/format';
import { Topbar } from '@/components/Topbar';
import { PlusIcon } from '@/components/icons';
import styles from './projects.module.css';

/** Projects: list + the selected project's panels, read-only until plan 02 (05-design-ui §4.4). */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = firstValues(await searchParams);
  const [t, projects] = await Promise.all([getT(), getProjects()]);
  const slug = sp.project ?? projects[0]?.slug;
  const project = slug ? await getProject(slug) : null;
  const soon = t('common.soon', { plan: '02' });

  return (
    <main className="rl-main">
      <Topbar
        title={t('projects.title')}
        action={<span className="rl-hint">{t('projects.readOnly')}</span>}
      />
      <div className="rl-content">
        <div className={styles.cols}>
          <section className="rl-panel">
            <header className="rl-panel__head">
              <h3 className="rl-panel__title">{t('projects.title')}</h3>
              <button
                type="button"
                className="rl-btn rl-btn--sm rl-btn--ghost"
                disabled
                title={soon}
              >
                <PlusIcon />
                {t('projects.add')}
              </button>
            </header>
            <div className="rl-panel__body rl-panel__body--flush">
              <div className={styles.plist}>
                {projects.map((p) => (
                  <Link
                    key={p.slug}
                    href={`?project=${p.slug}`}
                    className={styles.pitem}
                    aria-current={p.slug === slug ? 'true' : undefined}
                  >
                    <div className={styles.nm}>{p.name}</div>
                    <div className={styles.mt}>
                      <span>{p.codePrefix}</span>
                      <span>{t('projects.reports', { n: p.reports })}</span>
                      <span>
                        {p.modelBug === p.modelIdea ? p.modelBug : `${p.modelBug} / ${p.modelIdea}`}
                      </span>
                      {p.status !== 'ACTIVE' ? (
                        <span>{t(`projects.status.${p.status}`)}</span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <div className={styles.right}>
            {!project ? (
              <div className="rl-empty">{t('projects.pickOne')}</div>
            ) : (
              <Panels project={project} t={t} soon={soon} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Panels({ project: p, t, soon }: { project: ProjectDetail; t: Translate; soon: string }) {
  const auth = HandoffJwtAuthConfigSchema.safeParse(p.authConfig);
  const form = FormConfigSchema.safeParse(p.formConfig);
  const mail = NotificationConfigSchema.safeParse(p.notificationConfig);
  const limits = LimitsSchema.safeParse(p.limits);
  const list = (v: string[] | undefined): string =>
    v && v.length ? v.join(', ') : t('common.none');

  return (
    <>
      <Panel
        title={p.name}
        head={
          <span
            className={`rl-badge ${p.status === 'ACTIVE' ? 'rl-badge--ok' : p.status === 'PAUSED' ? 'rl-badge--warn' : ''}`.trim()}
          >
            <i className="rl-badge__dot" />
            {t(`projects.status.${p.status}`)}
          </span>
        }
        foot={
          <>
            <span className="rl-hint">
              {t('projects.field.formLink')}: <span className="rl-mono">/p/{p.slug}/alarm</span>
            </span>
            <button
              type="button"
              className="rl-btn rl-btn--sm rl-btn--danger"
              disabled
              title={soon}
            >
              {t('projects.archive')}
            </button>
          </>
        }
      >
        <Kv
          rows={[
            [t('projects.field.slug'), <span className="rl-mono">{p.slug}</span>],
            [t('projects.field.codePrefix'), <span className="rl-mono">{p.codePrefix}</span>],
            [t('projects.field.timezone'), p.timezone],
            [t('projects.field.formLocale'), <span className="rl-mono">{p.formLocale}</span>],
            [t('projects.field.reportLocale'), <span className="rl-mono">{p.reportLocale}</span>],
          ]}
        />
      </Panel>

      <Panel title={t('projects.panel.repository')}>
        <Kv
          rows={[
            [t('projects.field.repoUrl'), <span className="rl-mono">{p.repoUrl}</span>],
            [t('projects.field.branch'), <span className="rl-mono">{p.repoDefaultBranch}</span>],
            [t('projects.field.subpath'), <span className="rl-mono">{p.repoSubpath ?? '—'}</span>],
            [
              t('projects.field.repoAuthEnv'),
              <span className="rl-mono">{p.repoAuthEnv ?? '—'}</span>,
            ],
            [
              t('projects.field.readFirst'),
              <span className="rl-mono">{list(p.repoReadFirst)}</span>,
            ],
          ]}
        />
      </Panel>

      <Panel title={t('projects.panel.agent')}>
        <Kv
          rows={[
            [t('projects.field.provider'), <span className="rl-mono">{p.providerKey}</span>],
            [t('projects.field.modelBug'), <span className="rl-mono">{p.modelBug}</span>],
            [t('projects.field.modelIdea'), <span className="rl-mono">{p.modelIdea}</span>],
            [t('projects.field.effort'), <span className="rl-mono">{p.effort ?? '—'}</span>],
            [t('projects.field.maxTurns'), <span className="rl-mono">{fmtInt(p.maxTurns)}</span>],
            [
              t('projects.field.timeout'),
              <span className="rl-mono">
                {t('projects.minutes', { n: Math.round(p.timeoutSec / 60) })}
              </span>,
            ],
            [t('projects.field.budget'), <span className="rl-mono">${p.budgetUsd}</span>],
            [t('projects.field.toolProfile'), <span className="rl-mono">{p.toolProfile}</span>],
            [t('projects.field.runnerMode'), <span className="rl-mono">{p.runnerMode}</span>],
          ]}
        />
      </Panel>

      <Panel title={t('projects.panel.prompts')}>
        <Kv
          rows={[
            [
              t('projects.field.activePrompt'),
              p.activePromptVersion ? (
                <span className="rl-mono">v{p.activePromptVersion.version}</span>
              ) : (
                t('projects.noPrompt')
              ),
            ],
          ]}
        />
      </Panel>

      <Panel title={t('projects.panel.access')}>
        <Kv
          rows={[
            [t('projects.field.adapter'), <span className="rl-mono">{p.authAdapter}</span>],
            ...(auth.success
              ? ([
                  [t('projects.field.issuer'), <span className="rl-mono">{auth.data.issuer}</span>],
                  [
                    t('projects.field.keys'),
                    <span className="rl-mono">
                      {auth.data.publicKeys.map((k) => `kid ${k.kid}`).join(', ')}
                    </span>,
                  ],
                  [
                    t('projects.field.reporterRoles'),
                    <span className="rl-mono">{list(auth.data.reporterRoles)}</span>,
                  ],
                  [
                    t('projects.field.adminRoles'),
                    <span className="rl-mono">{list(auth.data.adminRoles)}</span>,
                  ],
                  [
                    t('projects.field.adminEmails'),
                    <span className="rl-mono">{list(auth.data.adminEmails)}</span>,
                  ],
                  [
                    t('projects.field.sessionTtl'),
                    t('projects.minutes', { n: auth.data.sessionTtlMin }),
                  ],
                ] as [string, ReactNode][])
              : []),
          ]}
        />
      </Panel>

      <Panel title={t('projects.panel.forms')}>
        {form.success ? (
          <Kv
            rows={[
              [
                t('projects.field.bugFields'),
                <span className="rl-mono">
                  {list(
                    form.data.bug.fields.map((f) => `${f.key}:${f.type}${f.required ? '*' : ''}`),
                  )}
                </span>,
              ],
              [
                t('projects.field.ideaFields'),
                <span className="rl-mono">
                  {list(
                    form.data.idea.fields.map((f) => `${f.key}:${f.type}${f.required ? '*' : ''}`),
                  )}
                </span>,
              ],
              [
                t('projects.field.dictionaries'),
                <span className="rl-mono">{list(Object.keys(form.data.dictionaries))}</span>,
              ],
            ]}
          />
        ) : (
          <pre className={styles.pre}>{JSON.stringify(p.formConfig, null, 2)}</pre>
        )}
      </Panel>

      <Panel title={t('projects.panel.notifications')}>
        {mail.success ? (
          <Kv
            rows={[
              [
                t('projects.field.bugTo'),
                <span className="rl-mono">{list(mail.data.bug.to)}</span>,
              ],
              [
                t('projects.field.ideaTo'),
                <span className="rl-mono">{list(mail.data.idea.to)}</span>,
              ],
              [
                t('projects.field.failedTo'),
                <span className="rl-mono">{list(mail.data.failed.to)}</span>,
              ],
              [
                t('projects.field.subjectPrefix'),
                <span className="rl-mono">[{mail.data.subjectPrefix ?? p.codePrefix}]</span>,
              ],
            ]}
          />
        ) : (
          <pre className={styles.pre}>{JSON.stringify(p.notificationConfig, null, 2)}</pre>
        )}
      </Panel>

      <Panel title={t('projects.panel.limits')}>
        {limits.success ? (
          <Kv
            rows={[
              [
                t('projects.field.perDay'),
                <span className="rl-mono">{limits.data.reportsPerUserPerDay}</span>,
              ],
              [
                t('projects.field.attachments'),
                <span className="rl-mono">
                  {limits.data.maxAttachments} ×{' '}
                  {Math.round(limits.data.maxAttachmentBytes / 1024 / 1024)} MB
                </span>,
              ],
              [
                t('projects.field.mime'),
                <span className="rl-mono">{list(limits.data.allowedMimeTypes)}</span>,
              ],
            ]}
          />
        ) : (
          <pre className={styles.pre}>{JSON.stringify(p.limits, null, 2)}</pre>
        )}
      </Panel>
    </>
  );
}

function Panel({
  title,
  head,
  foot,
  children,
}: {
  title: string;
  head?: ReactNode;
  foot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rl-panel">
      <header className="rl-panel__head">
        <h3 className="rl-panel__title">{title}</h3>
        {head}
      </header>
      <div className="rl-panel__body">{children}</div>
      {foot ? <footer className="rl-panel__foot">{foot}</footer> : null}
    </section>
  );
}

function Kv({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className={`rl-kv ${styles.kv}`}>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
