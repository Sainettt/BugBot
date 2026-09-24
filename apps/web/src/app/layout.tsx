import type { Metadata } from 'next';
import { JetBrains_Mono, Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/i18n/I18nProvider';
import { getLang, getTheme } from '@/i18n/server';

// The three Relay families, exposed as the CSS variables bundle.css expects (05-design-ui §1).
const display = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['600'],
  variable: '--font-display',
  display: 'swap',
});
const sans = Manrope({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BugBot',
  description: 'Bug-report and idea triage for MAGTRANS internal apps',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, theme] = await Promise.all([getLang(), getTheme()]);
  return (
    <html
      lang={lang}
      data-theme={theme}
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="rl-root">
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
