/**
 * zod schemas for the JSON columns of `Project` (docs/02-entities.md §3.4). One file per column.
 * The API parses on every write (`PROJECT_CREATE` / `PROJECT_UPDATE`) and on read when a value
 * reaches business logic; the web builds the config page and the public forms from the same shapes.
 */

export * from './auth-config';
export * from './form-config';
export * from './notification-config';
export * from './limits';
export * from './provider-config';
