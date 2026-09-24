import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Operation, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { actorOwnerId, actorProjectUserId } from './request-context';

export interface HistoryInput {
  /** One user action = one group. Omit to start a new group; pass the id to append to one. */
  groupId?: string;
  /** Explicit actor; defaults to the request context. Never both an owner and a project user. */
  actor?: { ownerId?: string | null; projectUserId?: string | null };
  projectId?: string | null;
  operation: Operation;
  entityType: string;
  entityId: string;
  /** Diff or context. Secret-bearing fields are logged by name (`{ changed: true }`), never by value. */
  payload?: Prisma.InputJsonValue;
}

/** A Prisma client or the transaction client of the surrounding `$transaction`. */
export type Db = PrismaService | Prisma.TransactionClient;

/**
 * Writes `HistoryEvent` rows. Every owner action and every state change writes one — inside the
 * same transaction as the change when there is one (pass `tx`), so a retry can never produce an
 * event without its change or a change without its event.
 */
@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    input: HistoryInput,
    tx: Db = this.prisma,
  ): Promise<{ id: string; groupId: string }> {
    const ownerId = input.actor?.ownerId !== undefined ? input.actor.ownerId : actorOwnerId();
    const projectUserId =
      input.actor?.projectUserId !== undefined ? input.actor.projectUserId : actorProjectUserId();
    if (ownerId && projectUserId) {
      throw new Error('HistoryEvent cannot have both an owner and a project user as actor');
    }
    return tx.historyEvent.create({
      data: {
        groupId: input.groupId ?? randomUUID(),
        actorUserId: ownerId ?? null,
        actorProjectUserId: projectUserId ?? null,
        projectId: input.projectId ?? null,
        operation: input.operation,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload ?? {},
      },
      select: { id: true, groupId: true },
    });
  }
}
