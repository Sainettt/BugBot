import { z } from 'zod';

/**
 * `Project.limits` — abuse limits for the public forms. Defaults for a new project are the
 * decision of 2026-09-22: 5 reports per user per day, 5 attachments of 10 MB, images + PDF.
 */

export const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
] as const;

export const LimitsSchema = z.object({
  /** Counted per `ProjectUser` from the start of the day in `Project.timezone`. */
  reportsPerUserPerDay: z.number().int().min(1).max(1000).default(5),
  maxAttachments: z.number().int().min(0).max(20).default(5),
  maxAttachmentBytes: z
    .number()
    .int()
    .min(1024)
    .max(100 * 1024 * 1024)
    .default(10 * 1024 * 1024),
  allowedMimeTypes: z
    .array(z.string().regex(/^[\w.+-]+\/[\w.+-]+$/, 'MIME type'))
    .min(1)
    .default([...DEFAULT_ALLOWED_MIME_TYPES]),
});
export type Limits = z.infer<typeof LimitsSchema>;
export type LimitsInput = z.input<typeof LimitsSchema>;

export const DEFAULT_LIMITS: Limits = LimitsSchema.parse({});
