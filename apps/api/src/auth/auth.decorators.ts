import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthKind, OwnerUser } from './auth.types';

export const AUTH_KIND_KEY = 'auth:kind';

/**
 * Which session a route needs. Every route is `OWNER` unless it says otherwise; `PUBLIC` is
 * the login flow and /health; `PROJECT` is the reporter side (plan 02).
 */
export const Auth = (kind: AuthKind): MethodDecorator & ClassDecorator =>
  SetMetadata(AUTH_KIND_KEY, kind);

/** Reachable without any session. */
export const Public = (): MethodDecorator & ClassDecorator => Auth('PUBLIC');

/** The signed-in owner, as resolved by AuthGuard. */
export const CurrentOwner = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OwnerUser | undefined =>
    ctx.switchToHttp().getRequest<Request>().owner,
);
