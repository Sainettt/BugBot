import type { Prisma } from '@prisma/client';

/** Money leaves the API as a decimal string — never do float math on `Prisma.Decimal`. */
export function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  return value == null ? null : value.toFixed(4);
}

export function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/** Sum of the four token counters of a run; missing counters count as zero. */
export function runTokens(run: {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
}): number {
  return (
    (run.inputTokens ?? 0) +
    (run.outputTokens ?? 0) +
    (run.cacheReadTokens ?? 0) +
    (run.cacheWriteTokens ?? 0)
  );
}

/** `MAGG-42` */
export function reportCode(codePrefix: string, number: number): string {
  return `${codePrefix}-${number}`;
}
