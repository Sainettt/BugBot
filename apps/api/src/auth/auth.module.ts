import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AUTH_DEV_USER_EMAIL } from './auth.tokens';
import { HousekeepingService } from './housekeeping.service';
import { OwnerSessionService } from './owner-session.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    OwnerSessionService,
    HousekeepingService,
    AuthGuard,
    {
      provide: AUTH_DEV_USER_EMAIL,
      useFactory: (config: ConfigService<Env, true>): string =>
        config.get('NODE_ENV', { infer: true }) === 'production'
          ? ''
          : config.get('AUTH_DEV_USER', { infer: true }).trim().toLowerCase(),
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, OwnerSessionService, AuthGuard, AUTH_DEV_USER_EMAIL],
})
export class AuthModule {}
