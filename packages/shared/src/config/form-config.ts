import { z } from 'zod';

/**
 * `Project.formConfig` — the bug and idea forms of a project (02-entities §3.4, decision
 * 2026-09-22 "report fields = hybrid"). `title` and `description` are core columns of `Report`,
 * always present and never declared here; every other field is a `FieldDef`, and a submission
 * stores a self-describing snapshot `[{ key, label, type, value }]` so old reports outlive the form.
 */

export const FieldType = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  MULTISELECT: 'multiselect',
  CHECKBOX: 'checkbox',
} as const;
export type FieldType = (typeof FieldType)[keyof typeof FieldType];

/** Reserved by the core columns of `Report`. */
export const RESERVED_FIELD_KEYS = ['title', 'description'] as const;

/** Labels per UI language; at least one must be present. `pl` for MAGGuarantee, `en`, `ru` optional. */
export const FieldLabelsSchema = z
  .object({
    pl: z.string().min(1).max(200).optional(),
    en: z.string().min(1).max(200).optional(),
    ru: z.string().min(1).max(200).optional(),
  })
  .refine((l) => Boolean(l.pl ?? l.en ?? l.ru), { message: 'At least one label is required' });
export type FieldLabels = z.infer<typeof FieldLabelsSchema>;

/** One entry of a select / multiselect list, inline or from a dictionary. */
export const FieldOptionSchema = z.object({
  value: z.string().min(1).max(100),
  labels: FieldLabelsSchema,
});
export type FieldOption = z.infer<typeof FieldOptionSchema>;

export const FieldDefSchema = z
  .object({
    /** Snapshot key and form name: `role`, `appSection`. */
    key: z
      .string()
      .regex(/^[a-z][a-zA-Z0-9_]{0,63}$/, 'camelCase identifier')
      .refine((k) => !(RESERVED_FIELD_KEYS as readonly string[]).includes(k), {
        message: 'title and description are core columns, not form fields',
      }),
    type: z.nativeEnum(FieldType),
    required: z.boolean().default(false),
    labels: FieldLabelsSchema,
    /** Inline options for select / multiselect. */
    options: z.array(FieldOptionSchema).min(1).optional(),
    /** Or the key of a list in `formConfig.dictionaries` (roles, app sections). */
    dictionary: z.string().min(1).max(64).optional(),
  })
  .superRefine((f, ctx) => {
    const isList = f.type === FieldType.SELECT || f.type === FieldType.MULTISELECT;
    if (isList && !f.options && !f.dictionary) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${f.type} field "${f.key}" needs options or a dictionary`,
      });
    }
    if (!isList && (f.options || f.dictionary)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${f.type} field "${f.key}" cannot have options or a dictionary`,
      });
    }
    if (f.options && f.dictionary) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `field "${f.key}": options and dictionary are mutually exclusive`,
      });
    }
  });
export type FieldDef = z.infer<typeof FieldDefSchema>;

const FormDefSchema = z.object({
  fields: z.array(FieldDefSchema).max(30).default([]),
});

export const FormConfigSchema = z
  .object({
    bug: FormDefSchema.default({ fields: [] }),
    idea: FormDefSchema.default({ fields: [] }),
    /** Named option lists shared by fields: `{ roles: [...], sections: [...] }`. */
    dictionaries: z
      .record(z.string().min(1).max(64), z.array(FieldOptionSchema).min(1))
      .default({}),
  })
  .superRefine((cfg, ctx) => {
    for (const form of ['bug', 'idea'] as const) {
      const seen = new Set<string>();
      cfg[form].fields.forEach((f, i) => {
        if (seen.has(f.key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [form, 'fields', i, 'key'],
            message: `duplicate field key "${f.key}"`,
          });
        }
        seen.add(f.key);
        if (f.dictionary && !cfg.dictionaries[f.dictionary]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [form, 'fields', i, 'dictionary'],
            message: `unknown dictionary "${f.dictionary}"`,
          });
        }
      });
    }
  });
export type FormConfig = z.infer<typeof FormConfigSchema>;
export type FormConfigInput = z.input<typeof FormConfigSchema>;

/** A form with no extra fields — valid for a freshly created project. */
export const EMPTY_FORM_CONFIG: FormConfig = FormConfigSchema.parse({});

/** Snapshot row stored in `Report.fields` at submission time. */
export interface ReportFieldSnapshot {
  key: string;
  /** Label in the form's language at submission time — old reports render without the config. */
  label: string;
  type: FieldType;
  value: string | string[] | boolean | null;
}
