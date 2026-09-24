import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { validateEnv, type Env } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { cookieSecret } from './auth/auth.types';
import { OriginCheckMiddleware } from './common/origin-check.middleware';
import { requestContextMiddleware } from './common/request-context';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Env is injected into process.env by dotenv-cli (root .env); no per-app .env file.
      ignoreEnvFile: true,
      validate: validateEnv,
    }),
    // Enforced only where it matters (@UseGuards(ThrottlerGuard)): the login flow.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 30 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    HealthModule,
    AuthModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule implements NestModule {
  constructor(private readonly config: ConfigService<Env, true>) {}

  // Registered here rather than in main.ts so the test harness runs the same pipeline.
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        cookieParser(cookieSecret(this.config.get('SESSION_SECRET', { infer: true }))),
        requestContextMiddleware,
        OriginCheckMiddleware,
      )
      .forRoutes('*');
  }
}
