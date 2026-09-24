import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import type { Env } from '../config/env.validation';

const MUTATIONS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * CSRF backstop: a browser always sends Origin on a cross-origin mutation, so a mismatching one
 * is rejected. A request with neither Origin nor Referer is not a browser form post (curl,
 * supertest, the Next.js server) and passes — the session cookies are SameSite=Lax anyway.
 */
@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  private readonly allowed: string[];

  constructor(config: ConfigService<Env, true>) {
    const web = config.get('WEB_URL', { infer: true });
    const api = `http://localhost:${config.get('API_PORT', { infer: true })}`;
    this.allowed = [origin(web), origin(api)].filter((o): o is string => o !== null);
  }

  use(req: Request, _res: Response, next: NextFunction): void {
    if (!MUTATIONS.has(req.method)) return next();

    const referer = req.get('referer');
    const sent = req.get('origin') ?? (referer ? origin(referer) : null);
    if (sent && !this.allowed.includes(sent)) {
      throw new ForbiddenException('Request origin not allowed');
    }
    next();
  }
}

function origin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
