import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { setOwner } from '../common/request-context';
import { AUTH_KIND_KEY } from './auth.decorators';
import { AuthService } from './auth.service';
import { AUTH_DEV_USER_EMAIL } from './auth.tokens';
import { OWNER_SESSION_COOKIE, type AuthKind, type OwnerUser } from './auth.types';
import { OwnerSessionService } from './owner-session.service';

/**
 * The one global guard. It dispatches on `@Auth(kind)`:
 * - `OWNER` (default): an `osid` cookie resolving to an active owner, or — outside production —
 *   the AUTH_DEV_USER hatch when no cookie is present. Otherwise 401.
 * - `PUBLIC`: always passes; the owner is still attached when a cookie resolves.
 * - `PROJECT`: the reporter side — plan 02 adds the `psid` / `ProjectSession` branch.
 * Two cookies and two tables keep the two worlds apart by construction.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: OwnerSessionService,
    private readonly auth: AuthService,
    @Inject(AUTH_DEV_USER_EMAIL) private readonly devUserEmail: string,
  ) {
    if (this.devUserEmail) {
      this.logger.warn(
        `AUTH_DEV_USER is active — requests without a session act as ${this.devUserEmail}`,
      );
    }
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const kind =
      this.reflector.getAllAndOverride<AuthKind | undefined>(AUTH_KIND_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? 'OWNER';
    const req = ctx.switchToHttp().getRequest<Request>();

    if (kind === 'PROJECT') {
      throw new NotImplementedException('Project sessions arrive with plan 02');
    }

    const owner = await this.resolveOwner(req);
    if (owner) {
      req.owner = owner;
      setOwner(owner.id);
    }
    if (kind === 'PUBLIC') return true;
    if (!owner) throw new UnauthorizedException('Not signed in');
    return true;
  }

  private async resolveOwner(req: Request): Promise<OwnerUser | null> {
    const sessionId = (req.cookies as Record<string, string> | undefined)?.[OWNER_SESSION_COOKIE];
    if (sessionId) {
      const owner = await this.sessions.resolve(sessionId);
      if (owner) return owner;
    }
    // The cookie always wins; the hatch only fills the gap when there is none (or it is dead).
    return this.devUserEmail ? this.auth.devOwner(this.devUserEmail) : null;
  }
}
