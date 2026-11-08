import type {AppBindings, Platform} from '@/core/shared/platform';
import {runWriteback} from './writeback';

/** One registration on the existing minute Cron; restore mode never writes to an incumbent. */
export async function runParallelRun(controller: ScheduledController, environment: AppBindings, platformFor: (environment: AppBindings) => Platform) {
  if (environment.MANGO_RESTORE_MODE === '1') return;
  await runWriteback(platformFor(environment), controller.scheduledTime);
}
