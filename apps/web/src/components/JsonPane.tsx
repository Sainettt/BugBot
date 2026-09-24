import type { ReactNode } from 'react';

/**
 * `rl-code` pane with server-side highlighting (05-design-ui §4.2): keys `k`, strings `s`,
 * numbers `n`, booleans/null `b`, punctuation `p` — the classes Relay's bundle.css styles.
 */
const TOKEN =
  /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)|([{}[\],:])/g;

export function highlightJson(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const [, quoted, colon, num, bool, punct] = m;
    if (quoted !== undefined) {
      out.push(
        <span key={i++} className={colon ? 'k' : 's'}>
          {quoted}
        </span>,
      );
      if (colon) out.push(colon);
    } else if (num !== undefined) {
      out.push(
        <span key={i++} className="n">
          {num}
        </span>,
      );
    } else if (bool !== undefined) {
      out.push(
        <span key={i++} className="b">
          {bool}
        </span>,
      );
    } else if (punct !== undefined) {
      out.push(
        <span key={i++} className="p">
          {punct}
        </span>,
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function JsonPane({ value, maxHeight = 360 }: { value: unknown; maxHeight?: number }) {
  const text = JSON.stringify(value ?? null, null, 2);
  return (
    <pre className="rl-code" style={{ maxHeight }}>
      {highlightJson(text)}
    </pre>
  );
}
