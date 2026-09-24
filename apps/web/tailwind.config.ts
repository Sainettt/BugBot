import type { Config } from 'tailwindcss';

/**
 * Tailwind is for layout utilities only (grid, flex, gap, responsive). Every colour and font
 * comes from the Relay tokens in src/styles/tokens.css, so a utility and a `rl-*` class can
 * never disagree (05-design-ui.md §1).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        'surface-000': 'var(--surface-000)',
        'surface-100': 'var(--surface-100)',
        'surface-200': 'var(--surface-200)',
        'surface-300': 'var(--surface-300)',
        'surface-400': 'var(--surface-400)',
        'line-soft': 'var(--line-soft)',
        'line-strong': 'var(--line-strong)',
        'ink-100': 'var(--ink-100)',
        'ink-200': 'var(--ink-200)',
        'ink-300': 'var(--ink-300)',
        'accent-100': 'var(--accent-100)',
        'accent-200': 'var(--accent-200)',
        'accent-soft': 'var(--accent-soft)',
        'info-100': 'var(--info-100)',
        'warn-100': 'var(--warn-100)',
        'danger-100': 'var(--danger-100)',
        'success-100': 'var(--success-100)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      spacing: {
        'space-1': 'var(--space-1)',
        'space-2': 'var(--space-2)',
        'space-3': 'var(--space-3)',
        'space-4': 'var(--space-4)',
        'space-5': 'var(--space-5)',
        'space-6': 'var(--space-6)',
        'space-7': 'var(--space-7)',
        'space-8': 'var(--space-8)',
      },
      maxWidth: {
        content: 'var(--content-max)',
        form: 'var(--form-max)',
      },
    },
  },
  plugins: [],
};

export default config;
