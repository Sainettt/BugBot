import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AnalysisStatus, ReportKind, RunStatus, type DashboardPeriod } from '@bugbot/shared';

const PERIODS: DashboardPeriod[] = ['24h', '7d', 'all'];

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(PERIODS)
  period: DashboardPeriod = '24h';
}

class ListQueryDto {
  /** Project slug. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  project?: string;

  @IsOptional()
  @IsIn(PERIODS)
  period: DashboardPeriod = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;
}

export class ListReportsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(Object.values(ReportKind))
  kind?: ReportKind;

  @IsOptional()
  @IsIn(Object.values(AnalysisStatus))
  status?: AnalysisStatus;

  /** Title, reporter, or a report code like `MAGG-42`. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

export class ListRunsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(Object.values(RunStatus))
  status?: RunStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;
}
