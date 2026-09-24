-- Hand-written (plan 01 §4.2). Rules Prisma's schema language cannot express; the ORM layer
-- enforces the same rules in code, these make the database refuse a bug that slips past it.

-- One RUNNING analysis per project at a time — this index IS the rule the worker relies on
-- (02-entities §4.3): the loser of a dequeue race gets a unique violation, not a second run.
CREATE UNIQUE INDEX "Job_one_running_per_project" ON "Job" ("projectId") WHERE status = 'RUNNING';

-- A job can never have used more attempts than it is allowed.
ALTER TABLE "Job" ADD CONSTRAINT "Job_attempt_le_max" CHECK (attempt <= "maxAttempts");

-- Report numbers come from Project.reportCounter and start at 1.
ALTER TABLE "Report" ADD CONSTRAINT "Report_number_positive" CHECK (number > 0);

-- At most one actor per history event: an owner or a project user, never both.
ALTER TABLE "HistoryEvent"
  ADD CONSTRAINT "HistoryEvent_one_actor"
  CHECK (NOT ("actorUserId" IS NOT NULL AND "actorProjectUserId" IS NOT NULL));
