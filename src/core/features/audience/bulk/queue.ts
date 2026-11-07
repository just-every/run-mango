import type {Platform} from '@/core/shared/platform';
import {advanceBulkJob,readBulkReceipt} from './jobs';

/** One queued slice; when more is pending the next slice is queued only after this one committed. `wait` asks the queue to retry later. */
export async function continueBulkJob(platform:Platform,jobId:string):Promise<'wait'|'finished'> {
  const outcome=await advanceBulkJob(platform,jobId);
  if(outcome.waiting)return 'wait';
  const receipt=await readBulkReceipt(platform,jobId,{limit:1});
  if(receipt?.state!=='running')return 'finished';
  await platform.jobs.enqueue({kind:'contact.bulk',idempotencyKey:`bulk:${jobId}:${crypto.randomUUID()}`,payload:{jobId}});
  return 'finished';
}
