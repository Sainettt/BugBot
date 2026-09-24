import { testDatabaseUrl } from './test-database';

// Runs inside every Jest worker before the test framework loads: point Prisma at the test schema.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.WEB_URL = 'http://localhost:3100';
process.env.SESSION_SECRET = 'test-session-secret-test-session-secret';

// Specs act as this owner unless they boot the app without the hatch (see harness).
process.env.AUTH_DEV_USER = 'dev-owner@bugbot.test';
process.env.ADMIN_EMAILS = 'dev-owner@bugbot.test, owner@bugbot.test';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
