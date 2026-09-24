import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { testDatabaseUrl } from './test-database';

/** Bring the test schema up to date once per run (workers then reuse it). */
export default function globalSetup(): void {
  const DATABASE_URL = testDatabaseUrl();
  execSync('npx prisma migrate deploy', {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  });
}
