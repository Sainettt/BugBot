import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DashboardService } from './dashboard.service';
import { ProjectsService } from './projects.service';
import { ReportsService } from './reports.service';
import { RunsService } from './runs.service';
import { SettingsService } from './settings.service';

@Module({
  controllers: [AdminController],
  providers: [DashboardService, ReportsService, ProjectsService, RunsService, SettingsService],
})
export class AdminModule {}
