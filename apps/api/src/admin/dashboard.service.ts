import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminDashboard, DashboardPeriod } from '@bugbot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { periodBounds } from '../common/period';
import { needsHuman } from '../common/result';
import { runTokens } from '../common/serialize';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(period: DashboardPeriod): Promise<AdminDashboard> {
    const { since, prevSince } = periodBounds(period);
    const createdIn = since ? { createdAt: { gte: since } } : {};
    const finishedIn = since ? { finishedAt: { gte: since } } : {};
    const startedIn = since ? { startedAt: { gte: since } } : {};

    const [
      reports,
      reportsPrev,
      doneRuns,
      failedRuns,
      runsInPeriod,
      queued,
      running,
      newBugs,
      newIdeas,
    ] = await Promise.all([
      this.prisma.report.count({ where: createdIn }),
      since && prevSince
        ? this.prisma.report.count({ where: { createdAt: { gte: prevSince, lt: since } } })
        : Promise.resolve(0),
      this.prisma.agentRun.findMany({
        where: { status: 'DONE', ...finishedIn },
        select: { resultJson: true },
      }),
      this.prisma.agentRun.findMany({
        where: { status: { in: ['FAILED', 'TIMEOUT'] }, ...finishedIn },
        select: { error: true, status: true },
      }),
      this.prisma.agentRun.findMany({
        where: startedIn,
        select: {
          inputTokens: true,
          outputTokens: true,
          cacheReadTokens: true,
          cacheWriteTokens: true,
          costUsd: true,
        },
      }),
      this.prisma.job.count({ where: { status: 'QUEUED' } }),
      this.prisma.job.count({ where: { status: 'RUNNING' } }),
      this.prisma.report.count({ where: { triageStatus: 'NEW', kind: 'BUG' } }),
      this.prisma.report.count({ where: { triageStatus: 'NEW', kind: 'IDEA' } }),
    ]);

    const errorTally = new Map<string, number>();
    for (const run of failedRuns) {
      const code = run.error ?? run.status;
      errorTally.set(code, (errorTally.get(code) ?? 0) + 1);
    }
    const failedTopError = [...errorTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    let tokens = 0;
    let cost = new Prisma.Decimal(0);
    for (const run of runsInPeriod) {
      tokens += runTokens(run);
      if (run.costUsd) cost = cost.plus(run.costUsd);
    }

    return {
      period,
      reports,
      reportsPrev,
      analysed: doneRuns.length,
      needsHuman: doneRuns.filter((r) => needsHuman(r.resultJson)).length,
      failed: failedRuns.length,
      failedTopError,
      tokens,
      costUsd: cost.toFixed(4),
      queued,
      running,
      newBugs,
      newIdeas,
    };
  }
}
