-- CreateEnum
CREATE TYPE "OwnerRole" AS ENUM ('OWNER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RunnerMode" AS ENUM ('SHARED', 'DEDICATED');

-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('BUG', 'IDEA');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('NOT_SENT', 'QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "TriageStatus" AS ENUM ('NEW', 'SEEN', 'IN_PROGRESS', 'HANDLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('ANALYZE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'DONE', 'FAILED', 'TIMEOUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('REPORT_RECEIVED', 'ANALYSIS_DONE', 'ANALYSIS_FAILED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "Operation" AS ENUM ('OWNER_LOGIN', 'SETTING_UPDATE', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_STATUS', 'PROMPT_VERSION_CREATE', 'PROMPT_VERSION_ACTIVATE', 'PROJECT_USER_BLOCK', 'PROJECT_USER_UNBLOCK', 'REPORT_CREATE', 'REPORT_TRIAGE', 'REPORT_ANALYZE', 'REPORT_RERUN', 'JOB_CANCEL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "OwnerRole" NOT NULL DEFAULT 'OWNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "codePrefix" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Warsaw',
    "formLocale" TEXT NOT NULL DEFAULT 'pl',
    "reportLocale" TEXT NOT NULL DEFAULT 'ru',
    "repoUrl" TEXT NOT NULL,
    "repoDefaultBranch" TEXT NOT NULL DEFAULT 'main',
    "repoSubpath" TEXT,
    "repoAuthEnv" TEXT,
    "repoReadFirst" TEXT[],
    "providerKey" TEXT NOT NULL DEFAULT 'claude-code',
    "modelBug" TEXT NOT NULL DEFAULT 'opus',
    "modelIdea" TEXT NOT NULL DEFAULT 'opus',
    "effort" TEXT,
    "maxTurns" INTEGER NOT NULL DEFAULT 60,
    "timeoutSec" INTEGER NOT NULL DEFAULT 900,
    "budgetUsd" DECIMAL(10,2) NOT NULL DEFAULT 5,
    "toolProfile" TEXT NOT NULL DEFAULT 'read-only',
    "providerConfig" JSONB NOT NULL DEFAULT '{}',
    "runnerMode" "RunnerMode" NOT NULL DEFAULT 'SHARED',
    "authAdapter" TEXT NOT NULL DEFAULT 'handoff-jwt',
    "authConfig" JSONB NOT NULL,
    "formConfig" JSONB NOT NULL,
    "notificationConfig" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "reportCounter" INTEGER NOT NULL DEFAULT 0,
    "activePromptVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "brief" TEXT NOT NULL,
    "bugOverride" TEXT,
    "ideaOverride" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectUser" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "roles" TEXT[],
    "locale" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsedHandoffToken" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedHandoffToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "clientRequestId" TEXT,
    "kind" "ReportKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "locale" TEXT,
    "targetRef" TEXT,
    "projectUserId" TEXT NOT NULL,
    "reporterEmail" TEXT,
    "reporterName" TEXT,
    "reporterRoles" TEXT[],
    "analysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'NOT_SENT',
    "currentRunId" TEXT,
    "triageStatus" "TriageStatus" NOT NULL DEFAULT 'NEW',
    "ownerNote" TEXT,
    "triagedById" TEXT,
    "triagedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" "JobType" NOT NULL DEFAULT 'ANALYZE',
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 2,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "heartbeatAt" TIMESTAMP(3),
    "options" JSONB,
    "lastError" TEXT,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "providerKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "effort" TEXT,
    "toolProfile" TEXT NOT NULL,
    "promptVersionId" TEXT,
    "basePresetVersion" TEXT NOT NULL,
    "resultSchemaVersion" TEXT NOT NULL,
    "promptSnapshot" TEXT,
    "repoRef" TEXT NOT NULL,
    "repoCommit" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cacheReadTokens" INTEGER,
    "cacheWriteTokens" INTEGER,
    "numTurns" INTEGER,
    "costUsd" DECIMAL(10,4),
    "stopReason" TEXT,
    "resultJson" JSONB,
    "resultValid" BOOLEAN NOT NULL DEFAULT false,
    "resultMd" TEXT,
    "repairAttempted" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "log" TEXT,
    "logBytes" INTEGER,
    "logPurgedAt" TIMESTAMP(3),
    "logStorageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "runId" TEXT,
    "kind" "NotificationKind" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "recipient" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoryEvent" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorProjectUserId" TEXT,
    "projectId" TEXT,
    "operation" "Operation" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OwnerSession_userId_idx" ON "OwnerSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_codePrefix_key" ON "Project"("codePrefix");

-- CreateIndex
CREATE UNIQUE INDEX "Project_activePromptVersionId_key" ON "Project"("activePromptVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_projectId_version_key" ON "PromptVersion"("projectId", "version");

-- CreateIndex
CREATE INDEX "ProjectUser_projectId_email_idx" ON "ProjectUser"("projectId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectUser_projectId_externalId_key" ON "ProjectUser"("projectId", "externalId");

-- CreateIndex
CREATE INDEX "ProjectSession_projectUserId_idx" ON "ProjectSession"("projectUserId");

-- CreateIndex
CREATE INDEX "ProjectSession_projectId_expiresAt_idx" ON "ProjectSession"("projectId", "expiresAt");

-- CreateIndex
CREATE INDEX "UsedHandoffToken_expiresAt_idx" ON "UsedHandoffToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UsedHandoffToken_projectId_jti_key" ON "UsedHandoffToken"("projectId", "jti");

-- CreateIndex
CREATE UNIQUE INDEX "Report_currentRunId_key" ON "Report"("currentRunId");

-- CreateIndex
CREATE INDEX "Report_projectId_createdAt_idx" ON "Report"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Report_projectId_kind_idx" ON "Report"("projectId", "kind");

-- CreateIndex
CREATE INDEX "Report_projectId_analysisStatus_idx" ON "Report"("projectId", "analysisStatus");

-- CreateIndex
CREATE INDEX "Report_projectId_triageStatus_idx" ON "Report"("projectId", "triageStatus");

-- CreateIndex
CREATE INDEX "Report_triageStatus_createdAt_idx" ON "Report"("triageStatus", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Report_projectUserId_createdAt_idx" ON "Report"("projectUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Report_projectId_number_key" ON "Report"("projectId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Report_projectId_clientRequestId_key" ON "Report"("projectId", "clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");

-- CreateIndex
CREATE INDEX "Attachment_reportId_idx" ON "Attachment"("reportId");

-- CreateIndex
CREATE INDEX "Job_status_runAfter_priority_createdAt_idx" ON "Job"("status", "runAfter", "priority" DESC, "createdAt");

-- CreateIndex
CREATE INDEX "Job_reportId_idx" ON "Job"("reportId");

-- CreateIndex
CREATE INDEX "Job_projectId_status_idx" ON "Job"("projectId", "status");

-- CreateIndex
CREATE INDEX "AgentRun_reportId_startedAt_idx" ON "AgentRun"("reportId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "AgentRun_projectId_startedAt_idx" ON "AgentRun"("projectId", "startedAt");

-- CreateIndex
CREATE INDEX "AgentRun_status_idx" ON "AgentRun"("status");

-- CreateIndex
CREATE INDEX "AgentRun_jobId_idx" ON "AgentRun"("jobId");

-- CreateIndex
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_runId_kind_channel_recipient_key" ON "Notification"("runId", "kind", "channel", "recipient");

-- CreateIndex
CREATE INDEX "HistoryEvent_entityType_entityId_idx" ON "HistoryEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "HistoryEvent_projectId_createdAt_idx" ON "HistoryEvent"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "HistoryEvent_createdAt_idx" ON "HistoryEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OwnerSession" ADD CONSTRAINT "OwnerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_activePromptVersionId_fkey" FOREIGN KEY ("activePromptVersionId") REFERENCES "PromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUser" ADD CONSTRAINT "ProjectUser_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSession" ADD CONSTRAINT "ProjectSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSession" ADD CONSTRAINT "ProjectSession_projectUserId_fkey" FOREIGN KEY ("projectUserId") REFERENCES "ProjectUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedHandoffToken" ADD CONSTRAINT "UsedHandoffToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectUserId_fkey" FOREIGN KEY ("projectUserId") REFERENCES "ProjectUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_currentRunId_fkey" FOREIGN KEY ("currentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_triagedById_fkey" FOREIGN KEY ("triagedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEvent" ADD CONSTRAINT "HistoryEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEvent" ADD CONSTRAINT "HistoryEvent_actorProjectUserId_fkey" FOREIGN KEY ("actorProjectUserId") REFERENCES "ProjectUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEvent" ADD CONSTRAINT "HistoryEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
