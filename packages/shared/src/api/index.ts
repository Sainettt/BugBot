import type {
  AnalysisStatus,
  NotificationChannel,
  NotificationKind,
  NotificationStatus,
  OwnerRole,
  ProjectStatus,
  ReportKind,
  RunStatus,
  RunnerMode,
  TriageStatus,
} from '../enums';
import type { ReportFieldSnapshot } from '../config/form-config';

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
  /** Total tokens and cost of runs started in the period. */
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
  costUsd: string | null;
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

export interface AttachmentItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}

/** GET /admin/runs — one row; also the "Runs" tab of a report card. */
export interface AgentRunListItem {
  id: string;
  projectSlug: string;
  projectName: string;
  reportId: string;
  reportCode: string;
  kind: ReportKind;
  status: RunStatus;
  model: string;
  effort: string | null;
  promptVersion: number | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  numTurns: number | null;
  tokens: number;
  costUsd: string | null;
  stopReason: string | null;
  error: string | null;
}

/** The current run inside a report card: everything needed to show the result and to reproduce it. */
export interface AgentRunDetail extends AgentRunListItem {
  providerKey: string;
  toolProfile: string;
  basePresetVersion: string;
  resultSchemaVersion: string;
  repoRef: string;
  repoCommit: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  /** Raw agent output, kept even when invalid. */
  resultJson: unknown;
  resultValid: boolean;
  /** Markdown rendered by the backend from a valid `resultJson`. */
  resultMd: string | null;
  repairAttempted: boolean;
  /** Null once purged by retention (`logPurgedAt` set). */
  log: string | null;
  logPurgedAt: string | null;
}

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationStatus;
  sentAt: string | null;
  error: string | null;
}

/** GET /admin/reports/:id — the report card (drawer). */
export interface ReportCard {
  id: string;
  code: string;
  kind: ReportKind;
  title: string;
  description: string;
  fields: ReportFieldSnapshot[];
  locale: string | null;
  targetRef: string | null;
  project: { slug: string; name: string };
  reporter: { name: string | null; email: string | null; roles: string[] };
  analysisStatus: AnalysisStatus;
  needsHuman: boolean;
  triageStatus: TriageStatus;
  ownerNote: string | null;
  triagedAt: string | null;
  createdAt: string;
  attachments: AttachmentItem[];
  currentRun: AgentRunDetail | null;
  runs: AgentRunListItem[];
  notifications: NotificationItem[];
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

/** GET /admin/projects/:slug — the whole config. Secret-bearing columns hold env-variable NAMES only. */
export interface ProjectDetail {
  id: string;
  slug: string;
  name: string;
  codePrefix: string;
  status: ProjectStatus;
  timezone: string;
  formLocale: string;
  reportLocale: string;
  repoUrl: string;
  repoDefaultBranch: string;
  repoSubpath: string | null;
  repoAuthEnv: string | null;
  repoReadFirst: string[];
  providerKey: string;
  modelBug: string;
  modelIdea: string;
  effort: string | null;
  maxTurns: number;
  timeoutSec: number;
  budgetUsd: string;
  toolProfile: string;
  providerConfig: unknown;
  runnerMode: RunnerMode;
  authAdapter: string;
  authConfig: unknown;
  formConfig: unknown;
  notificationConfig: unknown;
  limits: unknown;
  reportCounter: number;
  activePromptVersion: { id: string; version: number; createdAt: string } | null;
  reports: number;
  createdAt: string;
  updatedAt: string;
}

/** GET /admin/settings — one `AppSetting` row. */
export interface AppSettingItem {
  key: string;
  value: unknown;
  updatedAt: string;
  updatedBy: string | null;
}

/** Cursor pagination envelope of every list endpoint. */
export interface Page<T> {
  items: T[];
  /** Opaque; pass back as `?cursor=` for the next page. Null on the last page. */
  nextCursor: string | null;
}
