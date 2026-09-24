import type { Prisma, PrismaClient } from '@prisma/client';
import {
  DEFAULT_LIMITS,
  FormConfigSchema,
  HandoffJwtAuthConfigSchema,
  NotificationConfigSchema,
  type FormConfigInput,
} from '@bugbot/shared';

/**
 * Seed data shared by `prisma/seed.ts` (dev database) and the test harness — one definition,
 * so the dashboard numbers a test asserts are the numbers the seeded cabinet shows.
 *
 * Stable layer: the `AppSetting` rows every environment needs. Demo layer: a fake `demo`
 * project with three reports in the three states the cabinet must render in plan 01 —
 * `DEMO-1` received and not sent to Claude, `DEMO-2` analysed with a result, `DEMO-3` queued.
 * No real people, no real keys.
 */

export const STABLE_SETTINGS: Record<string, Prisma.InputJsonValue> = {
  maxConcurrentRuns: 1,
  logRetentionDays: 90,
  mailFrom: 'bugbot@magtrans.eu',
  defaultTimezone: 'Europe/Warsaw',
};

export async function seedSettings(prisma: PrismaClient): Promise<void> {
  for (const [key, value] of Object.entries(STABLE_SETTINGS)) {
    await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: {} });
  }
}

/** The owner row for an allowlisted e-mail; the login flow does the same JIT upsert. */
export async function seedOwner(prisma: PrismaClient, email: string): Promise<{ id: string }> {
  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name: 'Owner' },
    update: {},
    select: { id: true },
  });
}

export const DEMO_SLUG = 'demo';
export const DEMO_CODE_PREFIX = 'DEMO';

const DEMO_FORM: FormConfigInput = {
  bug: {
    fields: [
      {
        key: 'role',
        type: 'select',
        required: true,
        labels: { pl: 'Rola', en: 'Role' },
        dictionary: 'roles',
      },
      {
        key: 'section',
        type: 'select',
        required: true,
        labels: { pl: 'Sekcja aplikacji', en: 'App section' },
        dictionary: 'sections',
      },
      {
        key: 'steps',
        type: 'textarea',
        labels: { pl: 'Kroki do odtworzenia', en: 'Steps to reproduce' },
      },
    ],
  },
  idea: {
    fields: [
      { key: 'area', type: 'select', labels: { pl: 'Obszar', en: 'Area' }, dictionary: 'sections' },
    ],
  },
  dictionaries: {
    roles: [
      { value: 'przewoznik', labels: { pl: 'Przewoźnik', en: 'Carrier' } },
      { value: 'opiekun', labels: { pl: 'Opiekun', en: 'Account manager' } },
      { value: 'planista', labels: { pl: 'Planista', en: 'Planner' } },
    ],
    sections: [
      { value: 'wnioski', labels: { pl: 'Wnioski', en: 'Claims' } },
      { value: 'auta', labels: { pl: 'Auta', en: 'Vehicles' } },
      { value: 'eksport', labels: { pl: 'Eksport', en: 'Export' } },
    ],
  },
};

/** A plausible `idea-result@1` document for the analysed demo idea (the real schema is plan 03). */
const DEMO_IDEA_RESULT = {
  summary:
    'Экспорт CSV по перевозчику за период: отдельный эндпоинт + кнопка на странице списка заявок. Затрагивает модуль отчётов и права ролей.',
  impact_areas: ['reports', 'claims list', 'roles'],
  risks: [
    'Экспорт по всем перевозчикам одним запросом может быть тяжёлым — нужна пагинация или фоновая задача.',
    'Роль przewoźnik должна видеть только свои заявки — фильтр обязателен на сервере.',
  ],
  options: [
    {
      title: 'Синхронный CSV до 5 000 строк',
      pros: ['просто'],
      cons: ['таймаут на больших периодах'],
    },
    {
      title: 'Фоновая задача + письмо со ссылкой',
      pros: ['масштабируется'],
      cons: ['больше кода'],
    },
  ],
  recommended_plan: [
    'Добавить сервисный метод выборки заявок с фильтром по перевозчику и периоду.',
    'Эндпоинт GET /claims/export.csv с проверкой роли.',
    'Кнопка «Eksport» на списке заявок, недоступна без выбранного периода.',
  ],
  effort_estimate: 'M',
  value: 0.7,
  questions: ['Нужны ли столбцы с суммами по километрам или только список заявок?'],
};

const DEMO_IDEA_RESULT_MD = `## Итог

Экспорт CSV по перевозчику за период: отдельный эндпоинт + кнопка на странице списка заявок.

## Что затрагивает

- reports
- claims list
- roles

## Рекомендуемый план

1. Добавить сервисный метод выборки заявок с фильтром по перевозчику и периоду.
2. Эндпоинт \`GET /claims/export.csv\` с проверкой роли.
3. Кнопка «Eksport» на списке заявок, недоступна без выбранного периода.

Оценка: **M**.
`;

export interface DemoSeed {
  projectId: string;
  ownerId: string;
  reportIds: { demo1: string; demo2: string; demo3: string };
  runId: string;
}

/**
 * Creates the demo project unless it already exists (then returns null and touches nothing —
 * `pnpm db:resetdb` rebuilds from scratch). `ownerEmail` becomes the recipient of every
 * notification and the owner who pressed "Send to Claude" on DEMO-3.
 */
export async function seedDemo(prisma: PrismaClient, ownerEmail: string): Promise<DemoSeed | null> {
  if (await prisma.project.findUnique({ where: { slug: DEMO_SLUG }, select: { id: true } })) {
    return null;
  }
  const owner = await seedOwner(prisma, ownerEmail);
  const recipient = ownerEmail.toLowerCase();

  const authConfig = HandoffJwtAuthConfigSchema.parse({
    issuer: DEMO_SLUG,
    publicKeys: [
      {
        kid: 'demo-1',
        pem: '-----BEGIN PUBLIC KEY-----\nDEMO-NOT-A-REAL-KEY\n-----END PUBLIC KEY-----',
      },
    ],
    reporterRoles: ['*'],
    adminRoles: ['admin'],
    adminEmails: [recipient],
  });
  const formConfig = FormConfigSchema.parse(DEMO_FORM);
  const notificationConfig = NotificationConfigSchema.parse({
    bug: { to: [recipient] },
    idea: { to: [recipient] },
    failed: { to: [recipient] },
  });

  const project = await prisma.project.create({
    data: {
      slug: DEMO_SLUG,
      name: 'Demo project',
      codePrefix: DEMO_CODE_PREFIX,
      repoUrl: 'https://git.example.com/demo/bugbot.git',
      repoReadFirst: ['CLAUDE.md', 'docs/README.md'],
      authConfig: authConfig as unknown as Prisma.InputJsonValue,
      formConfig: formConfig as unknown as Prisma.InputJsonValue,
      notificationConfig: notificationConfig as unknown as Prisma.InputJsonValue,
      limits: DEFAULT_LIMITS as unknown as Prisma.InputJsonValue,
      reportCounter: 3,
    },
    select: { id: true },
  });

  const prompt = await prisma.promptVersion.create({
    data: {
      projectId: project.id,
      version: 1,
      brief:
        'Demo project: a NestJS + Next.js app for kilometre-guarantee claims. Read CLAUDE.md and docs/ first. Analysis only — never call the orchestrator or sub-agents.',
      note: 'seeded',
      createdById: owner.id,
    },
    select: { id: true },
  });
  await prisma.project.update({
    where: { id: project.id },
    data: { activePromptVersionId: prompt.id },
  });

  const reporter = await prisma.projectUser.create({
    data: {
      projectId: project.id,
      externalId: 'demo-user-1',
      email: 'jan.kowalski@example.com',
      name: 'Jan Kowalski',
      roles: ['przewoznik'],
      locale: 'pl',
    },
    select: { id: true, email: true, name: true, roles: true },
  });
  const reporterSnapshot = {
    projectUserId: reporter.id,
    reporterEmail: reporter.email,
    reporterName: reporter.name,
    reporterRoles: reporter.roles,
  };

  const hoursAgo = (h: number): Date => new Date(Date.now() - h * 60 * 60 * 1000);

  // DEMO-1 — received, not sent to Claude yet (the state the "Send to Claude" button acts on).
  const demo1 = await prisma.report.create({
    data: {
      projectId: project.id,
      number: 1,
      kind: 'BUG',
      title: 'Eksport CSV zawiera puste wiersze',
      description:
        'Po wybraniu okresu 01–15.09 i kliknięciu Eksport plik ma 40 pustych wierszy na końcu. Firefox 130.',
      fields: [
        { key: 'role', label: 'Rola', type: 'select', value: 'przewoznik' },
        { key: 'section', label: 'Sekcja aplikacji', type: 'select', value: 'eksport' },
        {
          key: 'steps',
          label: 'Kroki do odtworzenia',
          type: 'textarea',
          value: '1. Wnioski → Eksport\n2. Okres 01–15.09\n3. Otwórz plik',
        },
      ] as Prisma.InputJsonValue,
      locale: 'pl',
      ...reporterSnapshot,
      analysisStatus: 'NOT_SENT',
      triageStatus: 'NEW',
      createdAt: hoursAgo(2),
      notifications: {
        create: { projectId: project.id, kind: 'REPORT_RECEIVED', recipient, status: 'PENDING' },
      },
    },
    select: { id: true },
  });

  // DEMO-2 — an idea already analysed: DONE job, DONE run with a result, current run set.
  const demo2 = await prisma.report.create({
    data: {
      projectId: project.id,
      number: 2,
      kind: 'IDEA',
      title: 'Eksport CSV wniosków przewoźnika za okres',
      description:
        'Przewoźnik powinien móc pobrać swoje wnioski za wybrany okres jako CSV, żeby rozliczać kilometry bez ręcznego przepisywania.',
      fields: [
        { key: 'area', label: 'Obszar', type: 'select', value: 'wnioski' },
      ] as Prisma.InputJsonValue,
      locale: 'pl',
      ...reporterSnapshot,
      analysisStatus: 'DONE',
      triageStatus: 'SEEN',
      triagedById: owner.id,
      triagedAt: hoursAgo(20),
      createdAt: hoursAgo(26),
    },
    select: { id: true },
  });
  const job2 = await prisma.job.create({
    data: {
      projectId: project.id,
      reportId: demo2.id,
      status: 'DONE',
      attempt: 1,
      requestedById: owner.id,
      createdAt: hoursAgo(25),
      finishedAt: hoursAgo(24),
    },
    select: { id: true },
  });
  const run2 = await prisma.agentRun.create({
    data: {
      projectId: project.id,
      reportId: demo2.id,
      jobId: job2.id,
      status: 'DONE',
      providerKey: 'claude-code',
      model: 'claude-opus-5-5',
      toolProfile: 'read-only',
      promptVersionId: prompt.id,
      basePresetVersion: 'idea@1',
      resultSchemaVersion: 'idea-result@1',
      repoRef: 'main',
      repoCommit: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
      startedAt: hoursAgo(25),
      finishedAt: hoursAgo(24),
      durationMs: 6_400,
      inputTokens: 15_120,
      outputTokens: 2_300,
      cacheReadTokens: 1_000,
      cacheWriteTokens: 0,
      numTurns: 14,
      costUsd: '0.4120',
      stopReason: 'done',
      resultJson: DEMO_IDEA_RESULT as Prisma.InputJsonValue,
      resultValid: true,
      resultMd: DEMO_IDEA_RESULT_MD,
      log: '[seed] demo run log — no real agent output',
      logBytes: 41,
      notifications: {
        create: {
          projectId: project.id,
          reportId: demo2.id,
          kind: 'ANALYSIS_DONE',
          recipient,
          status: 'SENT',
          sentAt: hoursAgo(24),
        },
      },
    },
    select: { id: true },
  });
  await prisma.report.update({ where: { id: demo2.id }, data: { currentRunId: run2.id } });

  // DEMO-3 — the owner pressed "Send to Claude": a QUEUED job waits for the worker.
  const demo3 = await prisma.report.create({
    data: {
      projectId: project.id,
      number: 3,
      kind: 'BUG',
      title: 'Nie można zapisać wniosku z kwotą 0',
      description: 'Formularz wniosku odrzuca kwotę 0 zł komunikatem „Nieprawidłowa wartość”.',
      fields: [
        { key: 'role', label: 'Rola', type: 'select', value: 'opiekun' },
        { key: 'section', label: 'Sekcja aplikacji', type: 'select', value: 'wnioski' },
      ] as Prisma.InputJsonValue,
      locale: 'pl',
      ...reporterSnapshot,
      analysisStatus: 'QUEUED',
      triageStatus: 'NEW',
      createdAt: hoursAgo(1),
      jobs: { create: { projectId: project.id, status: 'QUEUED', requestedById: owner.id } },
      notifications: {
        create: {
          projectId: project.id,
          kind: 'REPORT_RECEIVED',
          recipient,
          status: 'SENT',
          sentAt: hoursAgo(1),
        },
      },
    },
    select: { id: true },
  });

  const groupOf = (id: string): string => `seed-${id}`;
  await prisma.historyEvent.createMany({
    data: [
      {
        groupId: groupOf(demo1.id),
        actorProjectUserId: reporter.id,
        projectId: project.id,
        operation: 'REPORT_CREATE',
        entityType: 'Report',
        entityId: demo1.id,
        payload: { code: 'DEMO-1' },
      },
      {
        groupId: groupOf(demo2.id),
        actorProjectUserId: reporter.id,
        projectId: project.id,
        operation: 'REPORT_CREATE',
        entityType: 'Report',
        entityId: demo2.id,
        payload: { code: 'DEMO-2' },
      },
      {
        groupId: `${groupOf(demo2.id)}-analyze`,
        actorUserId: owner.id,
        projectId: project.id,
        operation: 'REPORT_ANALYZE',
        entityType: 'Report',
        entityId: demo2.id,
        payload: { jobId: job2.id },
      },
      {
        groupId: `${groupOf(demo2.id)}-triage`,
        actorUserId: owner.id,
        projectId: project.id,
        operation: 'REPORT_TRIAGE',
        entityType: 'Report',
        entityId: demo2.id,
        payload: { from: 'NEW', to: 'SEEN' },
      },
      {
        groupId: groupOf(demo3.id),
        actorProjectUserId: reporter.id,
        projectId: project.id,
        operation: 'REPORT_CREATE',
        entityType: 'Report',
        entityId: demo3.id,
        payload: { code: 'DEMO-3' },
      },
      {
        groupId: `${groupOf(demo3.id)}-analyze`,
        actorUserId: owner.id,
        projectId: project.id,
        operation: 'REPORT_ANALYZE',
        entityType: 'Report',
        entityId: demo3.id,
        payload: {},
      },
    ],
  });

  return {
    projectId: project.id,
    ownerId: owner.id,
    reportIds: { demo1: demo1.id, demo2: demo2.id, demo3: demo3.id },
    runId: run2.id,
  };
}
