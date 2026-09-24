import type { ReactNode } from 'react';
import { FailIcon, InfoIcon, OkIcon, WarnIcon } from './icons';

type Tone = 'neutral' | 'info' | 'warn' | 'danger' | 'ok';

const CLASS: Record<Tone, string> = {
  neutral: '',
  info: 'rl-callout--info',
  warn: 'rl-callout--warn',
  danger: 'rl-callout--danger',
  ok: 'rl-callout--ok',
};

export function Callout({
  tone = 'neutral',
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  const Icon =
    tone === 'warn' ? WarnIcon : tone === 'danger' ? FailIcon : tone === 'ok' ? OkIcon : InfoIcon;
  return (
    <div className={`rl-callout ${CLASS[tone]}`.trim()}>
      <Icon />
      <div>
        {title ? <b>{title}</b> : null}
        {children}
      </div>
    </div>
  );
}
