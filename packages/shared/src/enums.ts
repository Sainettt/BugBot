/**
 * Enums mirrored from apps/api/prisma/schema.prisma — the two files are kept in sync BY HAND.
 * When you add a value here, add it to the Prisma enum and write the migration; when you add one
 * there, add it here. Declared as `const` objects (usable as runtime values in every app) plus a
 * derived union type. UI labels are a web concern and live in the EN/PL dictionary, not here.
 *
 * Source of truth for the meaning of each value: docs/02-entities.md §2.
 */

export const OwnerRole = {
  OWNER: 'OWNER',
} as const;
export type OwnerRole = (typeof OwnerRole)[keyof typeof OwnerRole];

/** `PAUSED`: forms refuse new reports, queued jobs wait. `ARCHIVED`: read-only, sessions revoked. */
export const ProjectStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

/** Which runner container serves the project's workspace. */
export const RunnerMode = {
  SHARED: 'SHARED',
  DEDICATED: 'DEDICATED',
} as const;
export type RunnerMode = (typeof RunnerMode)[keyof typeof RunnerMode];

/** Selects the form, the preset, the result schema and the model. */
export const ReportKind = {
  BUG: 'BUG',
  IDEA: 'IDEA',
} as const;
export type ReportKind = (typeof ReportKind)[keyof typeof ReportKind];

/**
 * What the pipeline did with a report (denormalised from the latest job). `NOT_SENT` = received,
 * no job yet — the owner has not pressed "Send to Claude" (decision 2026-09-24: no automatic
 * analysis). Never mixed with the owner's own `TriageStatus`.
 */
export const AnalysisStatus = {
  NOT_SENT: 'NOT_SENT',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;
export type AnalysisStatus = (typeof AnalysisStatus)[keyof typeof AnalysisStatus];

/** What the owner did with a report. */
export const TriageStatus = {
  NEW: 'NEW',
  SEEN: 'SEEN',
  IN_PROGRESS: 'IN_PROGRESS',
  HANDLED: 'HANDLED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type TriageStatus = (typeof TriageStatus)[keyof typeof TriageStatus];

/** Only one type in v1; the enum keeps the queue generic (later: REPO_CHECK, TEST_RUN). */
export const JobType = {
  ANALYZE: 'ANALYZE',
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

export const JobStatus = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  DONE: 'DONE',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/** `FAILED` = provider error or invalid result; `TIMEOUT` = killed by the runner or the sweeper. */
export const RunStatus = {
  RUNNING: 'RUNNING',
  DONE: 'DONE',
  FAILED: 'FAILED',
  TIMEOUT: 'TIMEOUT',
  CANCELLED: 'CANCELLED',
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

/** `REPORT_RECEIVED` tells the owner there is something to send to Claude (decision 2026-09-24). */
export const NotificationKind = {
  REPORT_RECEIVED: 'REPORT_RECEIVED',
  ANALYSIS_DONE: 'ANALYSIS_DONE',
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
} as const;
export type NotificationKind = (typeof NotificationKind)[keyof typeof NotificationKind];

export const NotificationChannel = {
  EMAIL: 'EMAIL',
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

/** Audit operations written to `HistoryEvent`. `REPORT_ANALYZE` = the owner pressed "Send to Claude". */
export const Operation = {
  OWNER_LOGIN: 'OWNER_LOGIN',
  SETTING_UPDATE: 'SETTING_UPDATE',
  PROJECT_CREATE: 'PROJECT_CREATE',
  PROJECT_UPDATE: 'PROJECT_UPDATE',
  PROJECT_STATUS: 'PROJECT_STATUS',
  PROMPT_VERSION_CREATE: 'PROMPT_VERSION_CREATE',
  PROMPT_VERSION_ACTIVATE: 'PROMPT_VERSION_ACTIVATE',
  PROJECT_USER_BLOCK: 'PROJECT_USER_BLOCK',
  PROJECT_USER_UNBLOCK: 'PROJECT_USER_UNBLOCK',
  REPORT_CREATE: 'REPORT_CREATE',
  REPORT_TRIAGE: 'REPORT_TRIAGE',
  REPORT_ANALYZE: 'REPORT_ANALYZE',
  REPORT_RERUN: 'REPORT_RERUN',
  JOB_CANCEL: 'JOB_CANCEL',
} as const;
export type Operation = (typeof Operation)[keyof typeof Operation];
