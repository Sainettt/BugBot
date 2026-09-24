import { PrismaClient } from '@prisma/client';
import { seedDemo, seedSettings } from './seed-demo';

/**
 * `pnpm db:seed` — idempotent. Always upserts the stable `AppSetting` rows; with `SEED_DEMO=true`
 * (dev default) also creates the `demo` project once. It never runs the demo layer in
 * production and never deletes anything: to rebuild the demo, `pnpm db:resetdb`.
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedSettings(prisma);
    console.log('seed: AppSetting rows ensured');

    const wantDemo = process.env.SEED_DEMO === 'true' && process.env.NODE_ENV !== 'production';
    if (!wantDemo) {
      console.log('seed: demo layer skipped (SEED_DEMO != true or production)');
      return;
    }
    const ownerEmail = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .find(Boolean);
    if (!ownerEmail)
      throw new Error('seed: ADMIN_EMAILS must name at least one owner for the demo layer');

    const demo = await seedDemo(prisma, ownerEmail);
    console.log(
      demo
        ? `seed: demo project created (DEMO-1 not sent, DEMO-2 analysed, DEMO-3 queued) for ${ownerEmail}`
        : 'seed: demo project already exists — nothing changed (pnpm db:resetdb rebuilds it)',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
