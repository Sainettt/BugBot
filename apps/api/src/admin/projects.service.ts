import { Injectable, NotFoundException } from '@nestjs/common';
import type { ProjectDetail, ProjectListItem } from '@bugbot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { iso } from '../common/serialize';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ProjectListItem[]> {
    const [projects, jobs] = await Promise.all([
      this.prisma.project.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          slug: true,
          name: true,
          codePrefix: true,
          status: true,
          modelBug: true,
          modelIdea: true,
          _count: { select: { reports: true } },
        },
      }),
      this.prisma.job.groupBy({
        by: ['projectId', 'status'],
        where: { status: { in: ['QUEUED', 'RUNNING'] } },
        _count: { _all: true },
      }),
    ]);

    const counts = new Map<string, { queued: number; running: number }>();
    for (const row of jobs) {
      const entry = counts.get(row.projectId) ?? { queued: 0, running: 0 };
      if (row.status === 'QUEUED') entry.queued += row._count._all;
      if (row.status === 'RUNNING') entry.running += row._count._all;
      counts.set(row.projectId, entry);
    }

    return projects.map((p) => ({
      slug: p.slug,
      name: p.name,
      codePrefix: p.codePrefix,
      status: p.status,
      modelBug: p.modelBug,
      modelIdea: p.modelIdea,
      reports: p._count.reports,
      queued: counts.get(p.id)?.queued ?? 0,
      running: counts.get(p.id)?.running ?? 0,
    }));
  }

  /** The whole config. Nothing here is secret by construction — `repoAuthEnv` is an env NAME. */
  async detail(slug: string): Promise<ProjectDetail> {
    const p = await this.prisma.project.findUnique({
      where: { slug },
      include: {
        activePromptVersion: { select: { id: true, version: true, createdAt: true } },
        _count: { select: { reports: true } },
      },
    });
    if (!p) throw new NotFoundException('Project not found');

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      codePrefix: p.codePrefix,
      status: p.status,
      timezone: p.timezone,
      formLocale: p.formLocale,
      reportLocale: p.reportLocale,
      repoUrl: p.repoUrl,
      repoDefaultBranch: p.repoDefaultBranch,
      repoSubpath: p.repoSubpath,
      repoAuthEnv: p.repoAuthEnv,
      repoReadFirst: p.repoReadFirst,
      providerKey: p.providerKey,
      modelBug: p.modelBug,
      modelIdea: p.modelIdea,
      effort: p.effort,
      maxTurns: p.maxTurns,
      timeoutSec: p.timeoutSec,
      budgetUsd: p.budgetUsd.toFixed(2),
      toolProfile: p.toolProfile,
      providerConfig: p.providerConfig,
      runnerMode: p.runnerMode,
      authAdapter: p.authAdapter,
      authConfig: p.authConfig,
      formConfig: p.formConfig,
      notificationConfig: p.notificationConfig,
      limits: p.limits,
      reportCounter: p.reportCounter,
      activePromptVersion: p.activePromptVersion
        ? {
            id: p.activePromptVersion.id,
            version: p.activePromptVersion.version,
            createdAt: p.activePromptVersion.createdAt.toISOString(),
          }
        : null,
      reports: p._count.reports,
      createdAt: p.createdAt.toISOString(),
      updatedAt: iso(p.updatedAt) ?? p.createdAt.toISOString(),
    };
  }
}
