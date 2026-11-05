import type { Platform } from '@/core/shared/platform';
import { designLayoutKey, type DesignJob } from './repository';

/** New layouts have digest-addressed keys. A legacy original stays in place and
 * remains readable by its verified digest after later choices change the pointer.
 * Reading evidence never copies it or writes a previously erased object back. */
export async function readLayoutEvidence(platform: Platform, job: DesignJob, sha256: string) {
  const stored = await platform.blobs.get(designLayoutKey(job.id, sha256));
  if (stored) return (stored as R2ObjectBody).body;
  const legacy = await platform.blobs.get(designLayoutKey(job.id));
  if (!legacy) return null;
  const bytes = await legacy.arrayBuffer();
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return digest === sha256 ? new Response(bytes).body : null;
}
