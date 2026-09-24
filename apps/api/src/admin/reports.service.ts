import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AgentRunDetail,
  AgentRunListItem,
  Page,
  ReportCard,
  ReportFieldSnapshot,
  ReportListItem,
} from '@bugbot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { afterCursor, decodeCursor, pageOf } from '../common/cursor';
import { periodBounds } from '../common/period';
import { needsHuman, severityOf } from '../common/result';
import { decimalToString, iso, reportCode, runTokens } from '../common/serialize';
import type { ListReportsQueryDto } from './dto/queries';

const CODE_RE = /^([A-Za-z]{2,8})-(\d{1,9})$/;

const RUN_LIST_SELECT = {
  id: true,
  status: true,
  model: true,
  effort: true,
  startedAt: true,
  finishedAt: true,
  durationMs: true,
  numTurns: true,
  inputTokens: true,
  outputTokens: true,
  cacheReadTokens: true,
  cacheWriteTokens: true,
  costUsd: true,
  stopReason: true,
  error: true,
  promptVersion: { select: { version: true } },
} satisfies Prisma.AgentRunSelect;

const RUN_DETAIL_SELECT = {
  ...RUN_LIST_SELECT,
  providerKey: true,
  toolProfile: true,
  basePresetVersion: true,
  resultSchemaVersion: true,
  repoRef: true,
  repoCommit: true,
  resultJson: true,
  resultValid: true,
  resultMd: true,
  repairAttempted: true,
  log: true,
  logPurgedAt: true,
} satisfies Prisma.AgentRunSelect;

type RunListRow = Prisma.AgentRunGetPayload<{ select: typeof RUN_LIST_SELECT }>;
type RunDetailRow = Prisma.AgentRunGetPayload<{ select: typeof RUN_DETAIL_SELECT }>;

interface ReportRef {
  id: string;
  code: string;
  kind: ReportListItem['kind'];
  projectSlug: string;
  projectName: string;
}

export function toRunListItem(run: RunListRow, report: ReportRef): AgentRunListItem {
  return {
    id: run.id,
    projectSlug: report.projectSlug,
    projectName: report.projectName,
    reportId: report.id,
    reportCode: report.code,
    kind: report.kind,
    status: run.status,
    model: run.model,
    effort: run.effort,
    promptVersion: run.promptVersion?.version ?? null,
    startedAt: run.startedAt.toISOString(),
    finishedAt: iso(run.finishedAt),
    durationMs: run.durationMs,
    numTurns: run.numTurns,
    tokens: runTokens(run),
    costUsd: decimalToString(run.costUsd),
    stopReason: run.stopReason,
    error: run.error,
  };
}

export function toRunDetail(run: RunDetailRow, report: ReportRef): AgentRunDetail {
  return {
    ...toRunListItem(run, report),
    providerKey: run.providerKey,
    toolProfile: run.toolProfile,
    basePresetVersion: run.basePresetVersion,
    resultSchemaVersion: run.resultSchemaVersion,
    repoRef: run.repoRef,
    repoCommit: run.repoCommit,
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    cacheReadTokens: run.cacheReadTokens,
    cacheWriteTokens: run.cacheWriteTokens,
    resultJson: run.resultJson,
    resultValid: run.resultValid,
    resultMd: run.resultMd,
    repairAttempted: run.repairAttempted,
    log: run.log,
    logPurgedAt: iso(run.logPurgedAt),
  };
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListReportsQueryDto): Promise<Page<ReportListItem>> {
    const { since } = periodBounds(q.period);
    const cursor = decodeCursor(q.cursor);
    const and: Prisma.ReportWhereInput[] = [];

    if (q.project) and.push({ project: { slug: q.project } });
    if (q.kind) and.push({ kind: q.kind });
    if (q.status) and.push({ analysisStatus: q.status });
    if (since) and.push({ createdAt: { gte: since } });
    if (q.q?.trim()) {
      const text = q.q.trim();
      const code = CODE_RE.exec(text);
      and.push(
        code
          ? { project: { codePrefix: code[1].toUpperCase() }, number: Number(code[2]) }
          : {
              OR: [
                { title: { contains: text, mode: 'insensitive' } },
                { reporterName: { contains: text, mode: 'insensitive' } },
                { reporterEmail: { contains: text, mode: 'insensitive' } },
              ],
            },
      );
    }
    if (cursor) and.push(afterCursor('createdAt', cursor));

    const rows = await this.prisma.report.findMany({
      where: { AND: and },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
      select: {
        id: true,
        number: true,
        kind: true,
        title: true,
        reporterName: true,
        reporterRoles: true,
        analysisStatus: true,
        triageStatus: true,
        createdAt: true,
        project: { select: { slug: true, name: true, codePrefix: true } },
        currentRun: {
          select: {
            inputTokens: true,
            outputTokens: true,
            cacheReadTokens: true,
            cacheWriteTokens: true,
            costUsd: true,
            durationMs: true,
            resultJson: true,
          },
        },
      },
    });

    const page = pageOf(rows, q.limit, (r) => r.createdAt);
    return {
      items: page.items.map((r) => ({
        id: r.id,
        code: reportCode(r.project.codePrefix, r.number),
        kind: r.kind,
        title: r.title,
        projectSlug: r.project.slug,
        projectName: r.project.name,
        reporterName: r.reporterName,
        reporterRoles: r.reporterRoles,
        analysisStatus: r.analysisStatus,
        needsHuman: r.analysisStatus === 'DONE' && needsHuman(r.currentRun?.resultJson),
        severity: r.kind === 'BUG' ? severityOf(r.currentRun?.resultJson) : null,
        triageStatus: r.triageStatus,
        createdAt: r.createdAt.toISOString(),
        currentRun: r.currentRun
          ? {
              tokens: runTokens(r.currentRun),
              costUsd: decimalToString(r.currentRun.costUsd),
              durationMs: r.currentRun.durationMs,
            }
          : null,
      })),
      nextCursor: page.nextCursor,
    };
  }

  async card(id: string): Promise<ReportCard> {
    const r = await this.prisma.report.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        kind: true,
        title: true,
        description: true,
        fields: true,
        locale: true,
        targetRef: true,
        reporterName: true,
        reporterEmail: true,
        reporterRoles: true,
        analysisStatus: true,
        triageStatus: true,
        ownerNote: true,
        triagedAt: true,
        createdAt: true,
        project: { select: { slug: true, name: true, codePrefix: true } },
        attachments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
            width: true,
            height: true,
          },
        },
        currentRun: { select: RUN_DETAIL_SELECT },
        runs: { orderBy: { startedAt: 'desc' }, select: RUN_LIST_SELECT },
        notifications: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            kind: true,
            channel: true,
            recipient: true,
            status: true,
            sentAt: true,
            error: true,
          },
        },
      },
    });
    if (!r) throw new NotFoundException('Report not found');

    const ref: ReportRef = {
      id: r.id,
      code: reportCode(r.project.codePrefix, r.number),
      kind: r.kind,
      projectSlug: r.project.slug,
      projectName: r.project.name,
    };
    return {
      id: r.id,
      code: ref.code,
      kind: r.kind,
      title: r.title,
      description: r.description,
      fields: (Array.isArray(r.fields) ? r.fields : []) as unknown as ReportFieldSnapshot[],
      locale: r.locale,
      targetRef: r.targetRef,
      project: { slug: r.project.slug, name: r.project.name },
      reporter: { name: r.reporterName, email: r.reporterEmail, roles: r.reporterRoles },
      analysisStatus: r.analysisStatus,
      needsHuman: r.analysisStatus === 'DONE' && needsHuman(r.currentRun?.resultJson),
      triageStatus: r.triageStatus,
      ownerNote: r.ownerNote,
      triagedAt: iso(r.triagedAt),
      createdAt: r.createdAt.toISOString(),
      attachments: r.attachments,
      currentRun: r.currentRun ? toRunDetail(r.currentRun, ref) : null,
      runs: r.runs.map((run) => toRunListItem(run, ref)),
      notifications: r.notifications.map((n) => ({ ...n, sentAt: iso(n.sentAt) })),
    };
  }
}
