import type { AnalysisStatus, OwnerRole, ProjectStatus, ReportKind, TriageStatus } from '../enums';

/**
 * Response shapes of the owner API that the web renders (plan 01 §4.4). Plain interfaces, no
 * runtime. Money is a decimal string (`"0.4120"`), never a float — the API converts
 * `Prisma.Decimal` at the boundary; dates are ISO strings.
 */

/** GET /auth/me */
export interface AuthMe {
  id: string;
  email: string;
  name: string | null;
  role: OwnerRole;
}

export type DashboardPeriod = '24h' | '7d' | 'all';

/** GET /admin/dashboard?period= — the four Relay tiles, the queue badge and the nav counts. */
export interface AdminDashboard {
  period: DashboardPeriod;
  /** Reports created in the period, and in the previous period of the same length (the tile note). */
  reports: number;
  reportsPrev: number;
  /** Runs finished DONE in the period. */
  analysed: number;
  /** DONE runs whose result says `is_bug = unclear` or `confidence < 0.5` (derived, 05-design-ui §3). */
  needsHuman: number;
  failed: number;
  /** Dominant error code among failed runs in the period, e.g. `RESULT_SCHEMA`. */
  failedTopError: string | null;
  /** Total tokens and cost of runs in the period. */
  tokens: number;
  costUsd: string;
  /** Live queue state, independent of the period. */
  queued: number;
  running: number;
  /** `triageStatus = NEW` counts for the sidebar. */
  newBugs: number;
  newIdeas: number;
}

/** Usage of the report's current (latest successful) run, for list rows. */
export interface RunUsageSummary {
  tokens: number;
  costUsd: string;
  durationMs: number | null;
}

/** GET /admin/reports — one feed row. */
export interface ReportListItem {
  id: string;
  /** `MAGG-42` */
  code: string;
  kind: ReportKind;
  title: string;
  projectSlug: string;
  projectName: string;
  reporterName: string | null;
  reporterRoles: string[];
  analysisStatus: AnalysisStatus;
  needsHuman: boolean;
  /** `result.severity` of the current run (`critical` / `high` / `medium` / `low`); null for ideas or no run. */
  severity: string | null;
  triageStatus: TriageStatus;
  createdAt: string;
  currentRun: RunUsageSummary | null;
}

/** GET /admin/projects — one row of the project list. */
export interface ProjectListItem {
  slug: string;
  name: string;
  codePrefix: string;
  status: ProjectStatus;
  modelBug: string;
  modelIdea: string;
  reports: number;
  queued: number;
  running: number;
}

/** Cursor pagination envelope of every list endpoint. */
export interface Page<T> {
  items: T[];
  /** Opaque; pass back as `?cursor=` for the next page. Null on the last page. */
  nextCursor: string | null;
}
