import type { AppBindings, Platform } from '@/core/shared/platform';
import { compose, createProductionPlatform, createLocalPlatform } from './runtime';
import { demoConfig } from './demo-config';
import { createDemoAdapters } from './demo/adapters';

// Worker-only composition keeps Cloudflare's demo runtime out of Node tools.
export function createDemoPlatform(environment: AppBindings): Platform {
  const config = demoConfig(environment);
  return compose(environment, config, createDemoAdapters(environment, config));
}
export const createWorkerPlatform = (environment: AppBindings) =>
  environment.RER_DEMO === '1' ? createDemoPlatform(environment) : createProductionPlatform(environment);
export const createLocalWorkerPlatform = (environment: AppBindings, signingKey: string) =>
  environment.RER_DEMO === '1' ? createDemoPlatform(environment) : createLocalPlatform(environment, signingKey);
