import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OwnerSessionService } from './owner-session.service';

/**
 * Nightly hygiene (02-entities §4.16): expired owner and project sessions and used handoff
 * tokens past their expiry serve no purpose and hold FKs. Log purging joins this job in plan 03.
 */
@Injectable()
export class HousekeepingService {
  private readonly logger = new Logger(HousekeepingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ownerSessions: OwnerSessionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async sweep(): Promise<void> {
    const now = new Date();
    const owners = await this.ownerSessions.deleteExpired();
    const [projects, tokens] = await Promise.all([
      this.prisma.projectSession.deleteMany({ where: { expiresAt: { lte: now } } }),
      this.prisma.usedHandoffToken.deleteMany({ where: { expiresAt: { lte: now } } }),
    ]);
    if (projects.count || tokens.count) {
      this.logger.log(
        `Removed ${owners} owner session(s), ${projects.count} project session(s), ${tokens.count} used token(s)`,
      );
    }
  }
}
