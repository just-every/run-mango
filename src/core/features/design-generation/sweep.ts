import type { Platform } from '@/core/shared/platform';
import { designCommand } from './advance';
import { createDesignRepository } from './repository';

/** A run whose queue message went quiet for this long is handed to the queue again; passes are idempotent. */
const quietMs = 2 * 60_000;

/** Cron sweep (DESIGN-007): runs past their deadline fail visibly as `provider_timeout`, and live runs whose message
 * was lost are resumed. Nothing is ever deleted. */
export async function sweepDesignJobs(platform: Platform, now = Date.now()) {
  const repository = createDesignRepository(platform.database.$client);
  await repository.failStale(now);
  for (const job of await repository.quiet(now, quietMs)) {
    if (await repository.update(job.id, [job.state], {}, now)) await platform.jobs.enqueue(designCommand(job.state === 'drafting' ? 'design.draft' : 'design.layout', job.id));
  }
}
