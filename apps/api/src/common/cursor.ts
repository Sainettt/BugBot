import { BadRequestException } from '@nestjs/common';

/** Keyset cursor for lists ordered by a timestamp desc, id desc. */
export interface Cursor {
  at: Date;
  id: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.at.toISOString()}|${c.id}`, 'utf8').toString('base64url');
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  const text = Buffer.from(raw, 'base64url').toString('utf8');
  const sep = text.indexOf('|');
  const at = sep > 0 ? new Date(text.slice(0, sep)) : new Date(NaN);
  const id = sep > 0 ? text.slice(sep + 1) : '';
  if (Number.isNaN(at.getTime()) || !id) throw new BadRequestException('Invalid cursor');
  return { at, id };
}

/** Rows after the cursor in (timestamp desc, id desc) order, as a Prisma `OR` condition. */
export function afterCursor<F extends string>(
  field: F,
  cursor: Cursor,
): { OR: [Record<F, { lt: Date }>, Record<F, Date> & { id: { lt: string } }] } {
  return {
    OR: [
      { [field]: { lt: cursor.at } } as Record<F, { lt: Date }>,
      { [field]: cursor.at, id: { lt: cursor.id } } as Record<F, Date> & { id: { lt: string } },
    ],
  };
}

/** Take `limit + 1` rows; the extra one tells whether a next page exists. */
export function pageOf<T extends { id: string }>(
  rows: T[],
  limit: number,
  at: (row: T) => Date,
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  const nextCursor =
    rows.length > limit && last ? encodeCursor({ at: at(last), id: last.id }) : null;
  return { items, nextCursor };
}
