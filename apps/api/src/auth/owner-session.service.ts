import { Injectable, Logger } from '@nestjs/common';
import type { CookieOptions } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { OwnerUser } from './auth.types';
import { randomToken } from './token';

/** 8-hour sliding expiry (plan 01 §4.3): renewed on use once past half-life. */
export const OWNER_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const USER_SELECT = { id: true, email: true, name: true, role: true, isActive: true } as const;

@Injectable()
export class OwnerSessionService {
  private readonly logger = new Logger(OwnerSessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    meta: { userAgent?: string; ip?: string },
  ): Promise<{ id: string; expiresAt: Date }> {
    return this.prisma.ownerSession.create({
      data: {
        id: randomToken(),
        userId,
        expiresAt: new Date(Date.now() + OWNER_SESSION_TTL_MS),
        userAgent: meta.userAgent?.slice(0, 300) ?? null,
        ip: meta.ip ?? null,
      },
      select: { id: true, expiresAt: true },
    });
  }

  /**
   * Resolve a session id to its owner. Returns null (and drops the row) when the session is
   * expired or the owner was deactivated — a revoked owner is logged out on the next request.
   */
  async resolve(sessionId: string): Promise<OwnerUser | null> {
    const session = await this.prisma.ownerSession.findUnique({
      where: { id: sessionId },
      select: { id: true, expiresAt: true, user: { select: USER_SELECT } },
    });
    if (!session) return null;

    if (session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
      await this.destroy(sessionId);
      return null;
    }
    if (session.expiresAt.getTime() - Date.now() < OWNER_SESSION_TTL_MS / 2) {
      await this.prisma.ownerSession.update({
        where: { id: sessionId },
        data: { expiresAt: new Date(Date.now() + OWNER_SESSION_TTL_MS) },
      });
    }
    const { id, email, name, role } = session.user;
    return { id, email, name, role };
  }

  async destroy(sessionId: string): Promise<void> {
    await this.prisma.ownerSession.deleteMany({ where: { id: sessionId } });
  }

  async deleteExpired(): Promise<number> {
    const { count } = await this.prisma.ownerSession.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    if (count > 0) this.logger.log(`Removed ${count} expired owner session(s)`);
    return count;
  }

  /** Cookie flags shared by the login and logout paths. */
  cookieOptions(isProduction: boolean, maxAge = OWNER_SESSION_TTL_MS): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/', maxAge };
  }
}
