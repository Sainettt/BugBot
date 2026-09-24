import { z } from 'zod';

/**
 * `Project.notificationConfig` — who gets e-mails per report kind (02-entities §3.4, PLAN.md §4.6).
 * `bug` / `idea` recipients get `REPORT_RECEIVED` on submission and `ANALYSIS_DONE` after a run;
 * `failed` recipients get `ANALYSIS_FAILED`. Subject format is fixed: `[<prefix>][bug] MAGG-42: title`.
 */

const RecipientsSchema = z.object({
  to: z
    .array(
      z
        .string()
        .email()
        .transform((s) => s.toLowerCase()),
    )
    .default([]),
});
export type Recipients = z.infer<typeof RecipientsSchema>;

export const NotificationConfigSchema = z.object({
  bug: RecipientsSchema.default({}),
  idea: RecipientsSchema.default({}),
  failed: RecipientsSchema.default({}),
  /** Subject prefix; defaults to the project's `codePrefix` when absent. */
  subjectPrefix: z.string().min(1).max(20).optional(),
});
export type NotificationConfig = z.infer<typeof NotificationConfigSchema>;
export type NotificationConfigInput = z.input<typeof NotificationConfigSchema>;
