import { z } from 'zod';

const EMAIL_LIST = /^\s*$|^[^,\s]+@[^,\s]+(\s*,\s*[^,\s]+@[^,\s]+)*\s*$/;

/**
 * Environment schema, validated at boot via ConfigModule — the app fails fast (throws) when a
 * required variable is missing or malformed. Values that must never reach production
 * (`AUTH_DEV_USER`) are refused there rather than silently ignored.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
    /** Container port; the host side maps it in .env (3101 in dev). */
    API_PORT: z.coerce.number().int().positive().default(3001),
    /** Origin of the cabinet — cookie/Origin checks and OAuth redirects. */
    WEB_URL: z.string().url().default('http://localhost:3100'),
    /** Signs the OAuth `state` cookie (and the web's `lang` cookie). Required in production. */
    SESSION_SECRET: z.string().default(''),
    GOOGLE_CLIENT_ID: z.string().default(''),
    GOOGLE_CLIENT_SECRET: z.string().default(''),
    /** Must match the Authorized redirect URI registered in the Google Cloud console. */
    GOOGLE_REDIRECT_URI: z.string().url().default('http://localhost:3101/auth/google/callback'),
    /** Comma-separated owner allowlist; see {@link adminEmails}. */
    ADMIN_EMAILS: z.string().regex(EMAIL_LIST, 'comma-separated e-mail addresses').default(''),
    /**
     * Development escape hatch: requests without a session act as this owner (JIT-created).
     * Refused in production by the check below — the hatch must never reach the VPS.
     */
    AUTH_DEV_USER: z.string().default(''),
    /** Attachment root (plan 02); declared now so the runner mount is known. */
    STORAGE_DIR: z.string().default('./.data/storage'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;

    if (env.AUTH_DEV_USER) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AUTH_DEV_USER'],
        message: 'must be empty in production — it bypasses authentication',
      });
    }
    if (env.SESSION_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SESSION_SECRET'],
        message: 'must be at least 32 characters in production (`openssl rand -base64 48`)',
      });
    }
    for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'is required in production',
        });
      }
    }
    if (adminEmails(env).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ADMIN_EMAILS'],
        message: 'must list at least one owner in production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** The allowlist as lower-cased addresses — an env edit adds an owner, no code or seed involved. */
export function adminEmails(env: Pick<Env, 'ADMIN_EMAILS'>): string[] {
  return env.ADMIN_EMAILS.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
