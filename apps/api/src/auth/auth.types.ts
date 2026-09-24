import { randomBytes } from 'node:crypto';
import type { AuthMe } from '@bugbot/shared';

/** Owner session cookie — an opaque `OwnerSession` row id. */
export const OWNER_SESSION_COOKIE = 'osid';
/** Project (reporter) session cookie — plan 02. Named now so the two can never be confused. */
export const PROJECT_SESSION_COOKIE = 'psid';
/** Short-lived signed cookie holding the OAuth `state` between the redirect and the callback. */
export const OAUTH_STATE_COOKIE = 'oauth_state';

/** Who signs in where. `OWNER` is the default of every route. */
export type AuthKind = 'OWNER' | 'PUBLIC' | 'PROJECT';

export type OwnerUser = AuthMe;

/**
 * Secret for cookie-parser's signed cookies. Production requires SESSION_SECRET (env validation);
 * in development an empty value falls back to a per-process random secret, which is fine for a
 * 10-minute OAuth state and means a restart merely voids in-flight sign-ins.
 */
export function cookieSecret(configured: string): string {
  return configured || randomBytes(32).toString('base64url');
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Filled by AuthGuard. Undefined on public routes without a session. */
      owner?: OwnerUser;
    }
  }
}
