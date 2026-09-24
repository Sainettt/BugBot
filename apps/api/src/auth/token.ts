import { randomBytes } from 'node:crypto';

/**
 * 256-bit opaque token for session ids and the OAuth state. Deliberately not the schema's
 * `cuid()` default: a cuid is mostly timestamp + counter and would make session ids guessable.
 */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}
