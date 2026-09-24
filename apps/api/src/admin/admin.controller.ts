import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AdminDashboard,
  AgentRunListItem,
  AppSettingItem,
  Page,
  ProjectDetail,
  ProjectListItem,
  ReportCard,
  ReportListItem,
} from '@bugbot/shared';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto, ListReportsQueryDto, ListRunsQueryDto } from './dto/queries';
import { ProjectsService } from './projects.service';
import { ReportsService } from './reports.service';
import { RunsService } from './runs.service';
import { SettingsService } from './settings.service';

/**
 * Read side of the owner cabinet (plan 01 §4.4). Every handler is OWNER-guarded by the global
 * AuthGuard's default. Writes — triage, "Send to Claude", reruns, project config — are plans
 * 02 and 04 and will write `HistoryEvent` rows through HistoryService.
 */
@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly reports: ReportsService,
    private readonly projects: ProjectsService,
    private readonly runs: RunsService,
    private readonly settings: SettingsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Tiles, queue badge and nav counts' })
  getDashboard(@Query() q: DashboardQueryDto): Promise<AdminDashboard> {
    return this.dashboard.get(q.period);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Cross-project feed, newest first, cursor-paginated' })
  listReports(@Query() q: ListReportsQueryDto): Promise<Page<ReportListItem>> {
    return this.reports.list(q);
  }

  @Get('reports/:id')
  @ApiOperation({
    summary: 'Report card: fields, attachments, current run, run history, notifications',
  })
  getReport(@Param('id') id: string): Promise<ReportCard> {
    return this.reports.card(id);
  }

  @Get('projects')
  listProjects(): Promise<ProjectListItem[]> {
    return this.projects.list();
  }

  @Get('projects/:slug')
  getProject(@Param('slug') slug: string): Promise<ProjectDetail> {
    return this.projects.detail(slug);
  }

  @Get('runs')
  listRuns(@Query() q: ListRunsQueryDto): Promise<Page<AgentRunListItem>> {
    return this.runs.list(q);
  }

  @Get('settings')
  listSettings(): Promise<AppSettingItem[]> {
    return this.settings.list();
  }
}
