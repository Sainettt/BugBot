import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb, seedFixtures } from './harness';
import type { DemoSeed } from '../prisma/seed-demo';

/** Proves the hand-written `add_integrity_rules` migration is applied, not just the generated one. */
describe('Database integrity rules (raw migration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let demo: DemoSeed;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    demo = await seedFixtures(prisma);
  });

  it('allows one RUNNING job per project (partial unique index)', async () => {
    const running = {
      projectId: demo.projectId,
      reportId: demo.reportIds.demo1,
      status: 'RUNNING' as const,
    };
    await prisma.job.create({ data: running });
    await expect(prisma.job.create({ data: running })).rejects.toMatchObject({ code: 'P2002' });
    // A second QUEUED or DONE job is fine — only RUNNING is exclusive.
    await prisma.job.create({ data: { ...running, status: 'QUEUED' } });
    await prisma.job.create({ data: { ...running, status: 'DONE' } });
  });

  it('refuses a history event with two actors (CHECK)', async () => {
    const reporter = await prisma.projectUser.findFirstOrThrow({
      where: { projectId: demo.projectId },
    });
    await expect(
      prisma.historyEvent.create({
        data: {
          groupId: 'g',
          actorUserId: demo.ownerId,
          actorProjectUserId: reporter.id,
          projectId: demo.projectId,
          operation: 'REPORT_TRIAGE',
          entityType: 'Report',
          entityId: demo.reportIds.demo1,
          payload: {},
        },
      }),
    ).rejects.toThrow();
  });

  it('refuses a non-positive report number and an attempt above maxAttempts (CHECK)', async () => {
    const reporter = await prisma.projectUser.findFirstOrThrow({
      where: { projectId: demo.projectId },
    });
    await expect(
      prisma.report.create({
        data: {
          projectId: demo.projectId,
          number: 0,
          kind: 'BUG',
          title: 'x',
          description: 'x',
          fields: [],
          projectUserId: reporter.id,
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.job.create({
        data: {
          projectId: demo.projectId,
          reportId: demo.reportIds.demo1,
          attempt: 3,
          maxAttempts: 2,
        },
      }),
    ).rejects.toThrow();
  });
});
