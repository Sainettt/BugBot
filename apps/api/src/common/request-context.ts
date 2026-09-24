import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

interface RequestContext {
  /** Filled by AuthGuard once an owner session (or the dev hatch) is resolved. */
  ownerId: string | null;
  /** Filled by the project-session branch of AuthGuard (plan 02). */
  projectUserId: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Opens a per-request store so services can stamp `HistoryEvent` actors without every method
 * growing an `actorId` parameter. Registered before the guard, which then fills in the actor —
 * the store is mutable for exactly that reason.
 */
export function requestContextMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  storage.run({ ownerId: null, projectUserId: null }, () => next());
}

export function setOwner(ownerId: string | null): void {
  const store = storage.getStore();
  if (store) store.ownerId = ownerId;
}

export function setProjectUser(projectUserId: string | null): void {
  const store = storage.getStore();
  if (store) store.projectUserId = projectUserId;
}

/** The owner acting in the current request. Null off a request or on public routes. */
export function actorOwnerId(): string | null {
  return storage.getStore()?.ownerId ?? null;
}

export function actorProjectUserId(): string | null {
  return storage.getStore()?.projectUserId ?? null;
}
