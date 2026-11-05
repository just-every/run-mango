import type { Platform } from '@/core/shared/platform';
import { designLayoutKey, type DesignJob } from './repository';

/** Preserve a pre-existing layout before another choice clears the current pointer.
 * New layouts have digest-addressed keys, so later purchases cannot overwrite them.
 * The original legacy object is kept too; DATA-001 exports the whole asset bucket. */
export async function retainLegacyLayout(platform: Platform, job: DesignJob) {
  if (!job.layerdocSha256) return;
  const key = designLayoutKey(job.id, job.layerdocSha256);
  if (await platform.blobs.get(key)) return;
  const original = await platform.blobs.get(designLayoutKey(job.id));
  if (original) await platform.blobs.put(key, await original.arrayBuffer(), {
    httpMetadata: original.httpMetadata, customMetadata: original.customMetadata,
  });
}

export async function readLayoutEvidence(platform: Platform, job: DesignJob, sha256: string) {
  return await platform.blobs.get(designLayoutKey(job.id, sha256))
    ?? (sha256 === job.layerdocSha256 ? await platform.blobs.get(designLayoutKey(job.id)) : null);
}
