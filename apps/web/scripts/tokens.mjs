/* global console */
// Generates src/styles/tokens.css from design/relay/tokens.json (05-design-ui.md §6).
// Run `pnpm --filter @bugbot/web tokens` after a re-sync of design/relay/; the output is
// committed so a build never depends on the design folder.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, '../../../design/relay/tokens.json');
const target = join(here, '../src/styles/tokens.css');

const tokens = JSON.parse(readFileSync(source, 'utf8'));

/** `{accent-100}` references resolve to the referenced variable. */
function cssValue(value) {
  if (typeof value === 'string') {
    const ref = /^\{([a-z0-9-]+)\}$/i.exec(value);
    return ref ? `var(--${ref[1]})` : value;
  }
  return null;
}

const dark = [];
const light = [];
const shared = [];

for (const token of tokens.color.tokens) {
  if (typeof token.value === 'string') {
    shared.push(`  --${token.name}: ${cssValue(token.value)};`);
  } else {
    dark.push(`  --${token.name}: ${token.value.dark};`);
    light.push(`  --${token.name}: ${token.value.light};`);
  }
}
for (const token of tokens.shadow.tokens) {
  dark.push(`  --${token.name}: ${token.value.dark};`);
  light.push(`  --${token.name}: ${token.value.light};`);
}
for (const group of ['spacing', 'radius', 'size']) {
  for (const token of tokens[group].tokens) shared.push(`  --${token.name}: ${token.value};`);
}

const out = `/* Generated from design/relay/tokens.json by scripts/tokens.mjs — do not edit by hand.
   Relay ${tokens.name} v${tokens.version}. Dark is the default theme; light is set with
   data-theme="light" on <html>. Font families come from next/font (src/app/layout.tsx) as
   --font-display / --font-sans / --font-mono, which the Relay component CSS expects. */

:root {
${[...dark, ...shared].join('\n')}
}

:root[data-theme='light'] {
${light.join('\n')}
}
`;

writeFileSync(target, out);
console.log(`tokens.css: ${dark.length} themed + ${shared.length} shared tokens → ${target}`);
