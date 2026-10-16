import { AsyncLocalStorage } from 'node:async_hooks';
import type { Platform } from '@/core/shared/platform';
import type { AuthenticatedOperator } from '@/core/features/auth/service';
// The Worker entry chooses the platform. SSR cannot infer local authority from bindings.
export const requestPlatform = new AsyncLocalStorage<Platform>();
// Admission belongs to this exact inbound document request. Direct server-function
// requests have no document admission and perform their own native authentication.
export const documentAdmission = new AsyncLocalStorage<{operator: AuthenticatedOperator}>();
// Reads stay inside this request's Hono pipeline: session, restore and erasure
// guards are identical to browser API reads, without another network round trip.
export const requestApi = new AsyncLocalStorage<(path: string) => Promise<Response>>();
export const initialReads = new AsyncLocalStorage<{operator: AuthenticatedOperator; once: Map<string, Promise<unknown>>}>();
/** Only concurrent initial GETs share work, after the server function has
 * authenticated this inbound request. Mutations and later requests never reuse it. */
export function initialReadOnce<T>(key: string, read: () => Promise<T>): Promise<T> {
  const scope = initialReads.getStore();
  if (!scope) return read();
  let pending = scope.once.get(key);
  if (!pending) { pending = read(); scope.once.set(key, pending); }
  return pending as Promise<T>;
}
export function currentPlatform() {
  const platform = requestPlatform.getStore();
  if (!platform) throw new Error('Missing request platform.');
  return platform;
}
