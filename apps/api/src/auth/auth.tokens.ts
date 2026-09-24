/**
 * The AUTH_DEV_USER e-mail, resolved once from the environment (always empty in production).
 * A DI token rather than a direct ConfigService read so tests can override it deterministically —
 * ConfigModule.forRoot() validates the environment at import time, long before a spec runs.
 */
export const AUTH_DEV_USER_EMAIL = 'AUTH_DEV_USER_EMAIL';
