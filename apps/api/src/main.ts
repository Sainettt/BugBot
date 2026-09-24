import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import type { Env } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<Env, true>);
  const production = config.get('NODE_ENV', { infer: true }) === 'production';

  // Behind the VPS reverse proxy: needed for Secure cookies and real client IPs.
  if (production) app.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.enableShutdownHooks();

  if (!production) {
    const doc = new DocumentBuilder()
      .setTitle('BugBot API')
      .setDescription('Multi-project bug-report and idea triage — owner cabinet API')
      .setVersion('0.1.0')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc));
  }

  const port = config.get('API_PORT', { infer: true });
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
