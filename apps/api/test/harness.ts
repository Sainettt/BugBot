import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AUTH_DEV_USER_EMAIL } from '../src/auth/auth.tokens';
import { OWNER_SESSION_TTL_MS } from '../src/auth/owner-session.service';
import { OWNER_SESSION_COOKIE } from '../src/auth/auth.types';
import { seedDemo, seedSettings, type DemoSeed } from '../prisma/seed-demo';
import { TEST_SCHEMA } from './test-database';

/** The AUTH_DEV_USER every spec runs as (see setup-env.ts); allowlisted in ADMIN_EMAILS. */
export const DEV_OWNER_EMAIL = 'dev-owner@bugbot.test';
/** A second allowlisted address, for the Google callback specs. */
export const SECOND_OWNER_EMAIL = 'owner@bugbot.test';

/**
 * The real app, wired exactly like main.ts (same ValidationPipe → same 400s).
 * `devUser: null` boots it without the AUTH_DEV_USER hatch, so unauthenticated requests get
 * the 401 a production client would get.
 */
export async function createTestApp(
  opts: { devUser?: string | null } = {},
): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (opts.devUser !== undefined) {
    builder.overrideProvider(AUTH_DEV_USER_EMAIL).useValue(opts.devUser ?? '');
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Create an owner with a live session; returns the Cookie header value. */
export async function signIn(
  prisma: PrismaService,
  overrides: { email?: string; isActive?: boolean; expiresAt?: Date } = {},
): Promise<{ cookie: string; userId: string; sessionId: string }> {
  const email = overrides.email ?? SECOND_OWNER_EMAIL;
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: 'Test owner', isActive: overrides.isActive ?? true },
    update: { isActive: overrides.isActive ?? true },
    select: { id: true },
  });
  const session = await prisma.ownerSession.create({
    data: {
      id: `test-session-${user.id}-${Date.now()}`,
      userId: user.id,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + OWNER_SESSION_TTL_MS),
    },
    select: { id: true },
  });
  return {
    cookie: `${OWNER_SESSION_COOKIE}=${session.id}`,
    userId: user.id,
    sessionId: session.id,
  };
}

const TABLES = [
  'HistoryEvent',
  'Notification',
  'AgentRun',
  'Job',
  'Attachment',
  'Report',
  'UsedHandoffToken',
  'ProjectSession',
  'ProjectUser',
  'PromptVersion',
  'Project',
  'AppSetting',
  'OwnerSession',
  'User',
]
  .map((t) => `"${TEST_SCHEMA}"."${t}"`)
  .join(',');

export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES} RESTART IDENTITY CASCADE`);
}

/** The same rows `pnpm db:seed` creates: settings + the demo project for the dev owner. */
export async function seedFixtures(prisma: PrismaService): Promise<DemoSeed> {
  await seedSettings(prisma);
  const demo = await seedDemo(prisma, DEV_OWNER_EMAIL);
  if (!demo)
    throw new Error('demo project already present after resetDb — TRUNCATE list is incomplete');
  return demo;
}
