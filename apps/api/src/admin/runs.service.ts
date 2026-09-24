import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AgentRunListItem, Page } from '@bugbot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { afterCursor, decodeCursor, pageOf } from '../common/cursor';
import { periodBounds } from '../common/period';
import { reportCode } from '../common/serialize';
import type { ListRunsQueryDto } from './dto/queries';
import { toRunListItem } from './reports.service';

@Injectable()
export class RunsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListRunsQueryDto): Promise<Page<AgentRunListItem>> {
    const { since } = periodBounds(q.period);
    const cursor = decodeCursor(q.cursor);
    const and: Prisma.AgentRunWhereInput[] = [];

    if (q.project) and.push({ project: { slug: q.project } });
    if (q.status) and.push({ status: q.status });
    if (q.model) and.push({ model: q.model });
    if (since) and.push({ startedAt: { gte: since } });
    if (cursor) and.push(afterCursor('startedAt', cursor));

    const rows = await this.prisma.agentRun.findMany({
      where: { AND: and },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
      select: {
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
        project: { select: { slug: true, name: true, codePrefix: true } },
        report: { select: { id: true, number: true, kind: true } },
      },
    });

    const page = pageOf(rows, q.limit, (r) => r.startedAt);
    return {
      items: page.items.map((run) =>
        toRunListItem(run, {
          id: run.report.id,
          code: reportCode(run.project.codePrefix, run.report.number),
          kind: run.report.kind,
          projectSlug: run.project.slug,
          projectName: run.project.name,
        }),
      ),
      nextCursor: page.nextCursor,
    };
  }
}
