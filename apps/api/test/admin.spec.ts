import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb, seedFixtures } from './harness';
import type { DemoSeed } from '../prisma/seed-demo';

/** The read-only cabinet endpoints against the seeded demo project (AUTH_DEV_USER hatch on). */
describe('Admin read endpoints', () => {
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

  const http = () => request(app.getHttpServer());

  describe('GET /admin/dashboard', () => {
    it('counts the seeded rows for the whole history', async () => {
      const res = await http().get('/admin/dashboard?period=all').expect(200);
      expect(res.body).toEqual({
        period: 'all',
        reports: 3,
        reportsPrev: 0,
        analysed: 1,
        needsHuman: 0,
        failed: 0,
        failedTopError: null,
        tokens: 18_420,
        costUsd: '0.4120',
        queued: 1,
        running: 0,
        newBugs: 2,
        newIdeas: 0,
      });
    });

    it('applies the period to reports and knows the previous period', async () => {
      const res = await http().get('/admin/dashboard').expect(200); // default 24h
      expect(res.body).toMatchObject({
        period: '24h',
        reports: 2,
        reportsPrev: 1,
        queued: 1,
        newBugs: 2,
      });
      await http().get('/admin/dashboard?period=1y').expect(400);
    });

    it('derives "needs a human" from the result and names the dominant error', async () => {
      await prisma.agentRun.update({
        where: { id: demo.runId },
        data: { resultJson: { is_bug: 'unclear', confidence: 0.9 } },
      });
      const job = await prisma.job.create({
        data: { projectId: demo.projectId, reportId: demo.reportIds.demo1, status: 'FAILED' },
      });
      const failed = {
        projectId: demo.projectId,
        reportId: demo.reportIds.demo1,
        jobId: job.id,
        providerKey: 'claude-code',
        model: 'opus',
        toolProfile: 'read-only',
        basePresetVersion: 'bug@1',
        resultSchemaVersion: 'bug-result@1',
        repoRef: 'main',
        finishedAt: new Date(),
      };
      await prisma.agentRun.create({
        data: { ...failed, status: 'FAILED', error: 'RESULT_SCHEMA' },
      });
      await prisma.agentRun.create({
        data: { ...failed, status: 'FAILED', error: 'RESULT_SCHEMA' },
      });
      await prisma.agentRun.create({ data: { ...failed, status: 'TIMEOUT', error: 'TIMEOUT' } });

      const res = await http().get('/admin/dashboard?period=all').expect(200);
      expect(res.body).toMatchObject({
        analysed: 1,
        needsHuman: 1,
        failed: 3,
        failedTopError: 'RESULT_SCHEMA',
      });
    });
  });

  describe('GET /admin/reports', () => {
    it('lists newest first with codes, statuses and the current run usage', async () => {
      const res = await http().get('/admin/reports').expect(200);
      expect(res.body.nextCursor).toBeNull();
      expect(res.body.items.map((r: { code: string }) => r.code)).toEqual([
        'DEMO-3',
        'DEMO-1',
        'DEMO-2',
      ]);

      const [demo3, demo1, demo2] = res.body.items;
      expect(demo1).toMatchObject({
        kind: 'BUG',
        analysisStatus: 'NOT_SENT',
        triageStatus: 'NEW',
        projectSlug: 'demo',
        projectName: 'Demo project',
        reporterName: 'Jan Kowalski',
        reporterRoles: ['przewoznik'],
        needsHuman: false,
        severity: null,
        currentRun: null,
      });
      expect(demo3).toMatchObject({ analysisStatus: 'QUEUED' });
      expect(demo2).toMatchObject({
        kind: 'IDEA',
        analysisStatus: 'DONE',
        triageStatus: 'SEEN',
        currentRun: { tokens: 18_420, costUsd: '0.4120', durationMs: 6_400 },
      });
    });

    it('filters by kind, status, code, text and project', async () => {
      const codes = async (qs: string): Promise<string[]> =>
        (await http().get(`/admin/reports?${qs}`).expect(200)).body.items.map(
          (r: { code: string }) => r.code,
        );

      expect(await codes('kind=IDEA')).toEqual(['DEMO-2']);
      expect(await codes('status=QUEUED')).toEqual(['DEMO-3']);
      expect(await codes('q=demo-2')).toEqual(['DEMO-2']);
      expect(await codes('q=Eksport')).toEqual(['DEMO-1', 'DEMO-2']);
      expect(await codes('q=kowalski')).toHaveLength(3);
      expect(await codes('project=demo')).toHaveLength(3);
      expect(await codes('project=nope')).toEqual([]);
      expect(await codes('period=24h')).toEqual(['DEMO-3', 'DEMO-1']);
      await http().get('/admin/reports?kind=TASK').expect(400);
      await http().get('/admin/reports?limit=0').expect(400);
    });

    it('paginates with an opaque cursor', async () => {
      const first = await http().get('/admin/reports?limit=2').expect(200);
      expect(first.body.items.map((r: { code: string }) => r.code)).toEqual(['DEMO-3', 'DEMO-1']);
      expect(first.body.nextCursor).toEqual(expect.any(String));

      const second = await http()
        .get(`/admin/reports?limit=2&cursor=${first.body.nextCursor}`)
        .expect(200);
      expect(second.body.items.map((r: { code: string }) => r.code)).toEqual(['DEMO-2']);
      expect(second.body.nextCursor).toBeNull();

      await http().get('/admin/reports?cursor=not-a-cursor').expect(400);
    });
  });

  describe('GET /admin/reports/:id', () => {
    it('returns the analysed report with its current run, history and notifications', async () => {
      const res = await http().get(`/admin/reports/${demo.reportIds.demo2}`).expect(200);
      expect(res.body).toMatchObject({
        code: 'DEMO-2',
        kind: 'IDEA',
        project: { slug: 'demo', name: 'Demo project' },
        reporter: {
          name: 'Jan Kowalski',
          email: 'jan.kowalski@example.com',
          roles: ['przewoznik'],
        },
        analysisStatus: 'DONE',
        triageStatus: 'SEEN',
        fields: [{ key: 'area', label: 'Obszar', type: 'select', value: 'wnioski' }],
        attachments: [],
      });
      expect(res.body.currentRun).toMatchObject({
        id: demo.runId,
        status: 'DONE',
        model: 'claude-opus-5-5',
        promptVersion: 1,
        resultValid: true,
        tokens: 18_420,
        costUsd: '0.4120',
        repoCommit: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
      });
      expect(res.body.currentRun.resultJson.effort_estimate).toBe('M');
      expect(res.body.currentRun.resultMd).toContain('## Итог');
      expect(res.body.runs).toHaveLength(1);
      expect(res.body.notifications).toEqual([
        expect.objectContaining({
          kind: 'ANALYSIS_DONE',
          status: 'SENT',
          recipient: 'dev-owner@bugbot.test',
        }),
      ]);
    });

    it('returns a received report with no run and its REPORT_RECEIVED notification', async () => {
      const res = await http().get(`/admin/reports/${demo.reportIds.demo1}`).expect(200);
      expect(res.body).toMatchObject({
        code: 'DEMO-1',
        analysisStatus: 'NOT_SENT',
        currentRun: null,
        runs: [],
      });
      expect(res.body.notifications).toEqual([
        expect.objectContaining({ kind: 'REPORT_RECEIVED', status: 'PENDING' }),
      ]);
      await http().get('/admin/reports/does-not-exist').expect(404);
    });
  });

  describe('GET /admin/projects', () => {
    it('lists projects with report and queue counts, and serves the full config', async () => {
      const list = await http().get('/admin/projects').expect(200);
      expect(list.body).toEqual([
        {
          slug: 'demo',
          name: 'Demo project',
          codePrefix: 'DEMO',
          status: 'ACTIVE',
          modelBug: 'opus',
          modelIdea: 'opus',
          reports: 3,
          queued: 1,
          running: 0,
        },
      ]);

      const detail = await http().get('/admin/projects/demo').expect(200);
      expect(detail.body).toMatchObject({
        slug: 'demo',
        budgetUsd: '5.00',
        maxTurns: 60,
        timeoutSec: 900,
        toolProfile: 'read-only',
        authAdapter: 'handoff-jwt',
        authConfig: { issuer: 'demo', reporterRoles: ['*'] },
        limits: { reportsPerUserPerDay: 5, maxAttachments: 5 },
        reportCounter: 3,
        reports: 3,
        activePromptVersion: { version: 1 },
      });
      await http().get('/admin/projects/nope').expect(404);
    });
  });

  describe('GET /admin/runs', () => {
    it('lists runs with their report code and filters by status and model', async () => {
      const res = await http().get('/admin/runs').expect(200);
      expect(res.body.items).toEqual([
        expect.objectContaining({
          id: demo.runId,
          reportCode: 'DEMO-2',
          kind: 'IDEA',
          projectSlug: 'demo',
          status: 'DONE',
          model: 'claude-opus-5-5',
          promptVersion: 1,
          tokens: 18_420,
          costUsd: '0.4120',
          numTurns: 14,
        }),
      ]);
      expect((await http().get('/admin/runs?status=FAILED').expect(200)).body.items).toEqual([]);
      expect(
        (await http().get('/admin/runs?model=claude-opus-5-5').expect(200)).body.items,
      ).toHaveLength(1);
      expect((await http().get('/admin/runs?model=haiku').expect(200)).body.items).toEqual([]);
    });
  });

  describe('GET /admin/settings', () => {
    it('returns the stable settings', async () => {
      const res = await http().get('/admin/settings').expect(200);
      expect(res.body.map((s: { key: string; value: unknown }) => [s.key, s.value])).toEqual([
        ['defaultTimezone', 'Europe/Warsaw'],
        ['logRetentionDays', 90],
        ['mailFrom', 'bugbot@magtrans.eu'],
        ['maxConcurrentRuns', 1],
      ]);
    });
  });
});
