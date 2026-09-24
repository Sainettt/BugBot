/**
 * Tests run against a dedicated Postgres **schema** (`bugbot_test`) inside the same dev database —
 * `prisma migrate deploy` creates it, so no CREATE DATABASE (and no psql on the host) is needed,
 * and dev data in `public` is never touched. (MAGSpace decision 2026-08-03.)
 */
export const TEST_SCHEMA = 'bugbot_test';

export function testDatabaseUrl(): string {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL is not set — run tests through dotenv (pnpm test).');
  const url = new URL(base);
  url.searchParams.set('schema', TEST_SCHEMA);
  return url.toString();
}
