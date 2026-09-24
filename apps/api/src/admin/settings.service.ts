import { Injectable } from '@nestjs/common';
import type { AppSettingItem } from '@bugbot/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AppSettingItem[]> {
    const rows = await this.prisma.appSetting.findMany({
      orderBy: { key: 'asc' },
      select: {
        key: true,
        value: true,
        updatedAt: true,
        updatedBy: { select: { email: true, name: true } },
      },
    });
    return rows.map((r) => ({
      key: r.key,
      value: r.value,
      updatedAt: r.updatedAt.toISOString(),
      updatedBy: r.updatedBy ? r.updatedBy.name?.trim() || r.updatedBy.email : null,
    }));
  }
}
