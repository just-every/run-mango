import {agentHandoff} from '../settings/sender-authority';
import { readImageHeader } from '@/core/features/campaign-assets/image-header';
import { campaignAssetLimits } from '@/core/features/campaign-assets/limits';
import { DesignImportError, parseLayerDoc } from '@/core/features/design-import/layerdoc';
import { DesignProviderError, type DesignProvider, type DesignRun, type Platform, type QueueCommand } from '@/core/shared/platform';
import { candidateSlots, type DesignFailureCode } from './model';
import { createDesignRepository, designCandidateKey, designLayoutKey, type DesignJob } from './repository';
import { designConcept } from './concept';

/** One pass of a design run (DESIGN-002/003), run by the queue consumer. Each pass reads the run's state, makes at
 * most the requests that state still needs, and either settles the run or asks to be called again after a delay.
 * Paid requests carry keys derived from the run, so a replayed message never buys twice. */
export type DesignCommand = QueueCommand & { kind: 'design.draft' | 'design.layout' };
export const designCommandKinds = ['design.draft', 'design.layout'] as const;
export const isDesignCommand = (command: QueueCommand): command is DesignCommand => (designCommandKinds as readonly string[]).includes(command.kind);
export const designCommand = (kind: DesignCommand['kind'], jobId: string): DesignCommand => ({ kind, idempotencyKey: `${kind}:${jobId}`, payload: { jobId } });

const pollSeconds = 5;
/** Passes a run may spend on 12ui failing to answer (5xx, a dropped connection or its own timeout) before it fails:
 * with the adapter's request timeouts and the backoff below, a silent service fails a run within about two minutes. */
const transientAttempts = 3;
const backoffSeconds = (attempt: number) => 5 * attempt;

async function hex(bytes: Uint8Array<ArrayBuffer>) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

type Pass = { again?: number };

/** 12ui answered a request of this pass: a wait it imposed is over, so the editor stops saying Mango is waiting
 * while 12ui draws or converts (DESIGN-007). The transient attempt count is kept: it bounds a flapping service. */
async function answered(platform: Platform, job: DesignJob, stage: 'drafting' | 'preparing') {
  if (!job.waitCode && !job.retryAt) return;
  await createDesignRepository(platform.database.$client).update(job.id, [stage], { waitCode: null, retryAt: null }, Date.now());
  job.waitCode = null; job.retryAt = null;
}

/** RESULT-004: one cost fact for each image 12ui reports bought (a slot past pending), keyed by the slot, so a purchase
 * whose answer never came is counted once 12ui shows it happened, and never when it did not. */
async function recordPurchases(platform: Platform, design: DesignProvider, job: DesignJob, run: DesignRun) {
  const repository = createDesignRepository(platform.database.$client);
  for (const candidate of run.candidates.filter(item => item.status !== 'pending')) {
    await repository.recordCost({ key: `design:${job.id}:draft:${candidate.slot}`, campaignId: job.campaignId, provider: design.provider, operation: 'design-draft', tier: 'standard', units: 1 }, Date.now());
  }
}

async function draftPass(platform: Platform, design: DesignProvider, job: DesignJob): Promise<Pass> {
  const repository = createDesignRepository(platform.database.$client);
  const slots = candidateSlots.slice(0, job.candidateCount);
  let runId = job.providerRunId;
  if (!runId) {
    const claimed = await agentHandoff(platform,()=>design.startDraft({ concept: designConcept(job.brief), slots: [...slots] }, `mango-design-${job.id}-draft`));
    if (claimed.candidates.length !== slots.length || claimed.candidates.some(candidate => !slots.includes(candidate.slot as typeof slots[number]))) throw new DesignProviderError('provider_invalid', 0);
    runId = claimed.runId;
    await repository.update(job.id, ['drafting'], { providerRunId: runId, waitCode: null, retryAt: null }, Date.now());
    job.waitCode = null; job.retryAt = null;
  }
  // Each candidate is stored as soon as it lands, so the editor shows it while the others are still drawing.
  const storing = new Map<string, Promise<void>>();
  const store = async () => {
    const current = await agentHandoff(platform,()=>design.readDraft(runId!));
    await recordPurchases(platform, design, job, current);
    const stored = new Set((await repository.candidates(job.id)).map(candidate => candidate.slot));
    await Promise.all(current.candidates.filter(candidate => !stored.has(candidate.slot) && slots.includes(candidate.slot as typeof slots[number])).map(candidate => {
      if (candidate.status !== 'succeeded' && candidate.status !== 'failed') return undefined;
      if (!storing.has(candidate.slot)) storing.set(candidate.slot, storeCandidate(platform, design, job.id, runId!, candidate.slot, candidate.status));
      return storing.get(candidate.slot);
    }));
    return current;
  };
  const before = await agentHandoff(platform,()=>design.readDraft(runId));
  await answered(platform, job, 'drafting');
  await recordPurchases(platform, design, job, before);
  const pending = before.candidates.filter(candidate => candidate.status === 'pending');
  // Every purchase is recorded even when another slot's request fails; the first failure is raised afterwards.
  const dispatched = await Promise.allSettled(pending.map(async candidate => {
    const outcome = await agentHandoff(platform,()=>design.dispatchCandidate(runId!, candidate.slot, `mango-design-${job.id}-draft-${candidate.slot}`));
    if (outcome === 'dispatched') await recordPurchases(platform, design, job, { runId: runId!, candidates: [{ slot: candidate.slot, status: 'dispatched' }] });
    await store();
  }));
  const refused = dispatched.find(result => result.status === 'rejected');
  if (refused) throw refused.reason;
  const run = await store();
  if (run.candidates.some(candidate => candidate.status === 'pending' || candidate.status === 'dispatched')) return { again: pollSeconds };
  const succeeded = run.candidates.some(candidate => candidate.status === 'succeeded');
  if (succeeded) await repository.update(job.id, ['drafting'], { state: 'choosing', attempts: 0, waitCode: null, retryAt: null }, Date.now());
  else await repository.fail(job.id, 'provider_failed', Date.now());
  return {};
}

async function storeCandidate(platform: Platform, design: DesignProvider, jobId: string, runId: string, slot: string, status: 'succeeded' | 'failed') {
  const repository = createDesignRepository(platform.database.$client);
  if (status === 'failed') return repository.recordCandidate({ jobId, slot, state: 'failed', sha256: null, bytes: null, width: null, height: null }, Date.now());
  // The adapter caps the download; the browser decodes the image to crop it, so its pixel size is bounded as uploads are.
  const bytes = await agentHandoff(platform,()=>design.candidateImage(runId, slot));
  const header = readImageHeader(bytes), side = campaignAssetLimits.maxPixelsPerSide;
  if (header?.contentType !== 'image/png' || header.width < 1 || header.height < 1 || header.width > side || header.height > side) throw new DesignProviderError('provider_invalid', 0);
  await platform.blobs.put(designCandidateKey(jobId, slot), bytes, { httpMetadata: { contentType: 'image/png' } });
  await repository.recordCandidate({ jobId, slot, state: 'succeeded', sha256: await hex(bytes), bytes: bytes.byteLength, width: header.width, height: header.height }, Date.now());
}

async function layoutPass(platform: Platform, design: DesignProvider, job: DesignJob, now: number): Promise<Pass> {
  const repository = createDesignRepository(platform.database.$client);
  const slot = job.chosenSlot;
  if (!slot) { await repository.fail(job.id, 'invalid_layout', now); return {}; }
  let layout;
  if (!job.providerLayoutId) {
    const image = await platform.blobs.get(designCandidateKey(job.id, slot));
    if (!image) throw new Error('The chosen candidate image is missing from storage.');
    // A try after a failed layout step is a new purchase with its own keys; round 0 keeps the run's first keys.
    const round = job.layoutRound ? `-${job.layoutRound}` : '';
    layout = await agentHandoff(platform,async()=>design.startLayout(new Blob([await image.arrayBuffer()], { type: 'image/png' }), `mango-design-${job.id}-layout-${slot}${round}`));
    await repository.recordCost({ key: `design:${job.id}:layout:${slot}${round}`, campaignId: job.campaignId, provider: design.provider, operation: 'design-layout', tier: 'fast', units: 1 }, Date.now());
    await repository.update(job.id, ['preparing'], { providerLayoutId: layout.layoutId, waitCode: null, retryAt: null }, Date.now());
    job.waitCode = null; job.retryAt = null;
  } else {
    layout = await agentHandoff(platform,()=>design.readLayout(job.providerLayoutId!));
    await answered(platform, job, 'preparing');
  }
  if (layout.status === 'queued' || layout.status === 'running') return { again: pollSeconds };
  if (layout.status !== 'succeeded') { await repository.fail(job.id, layout.status === 'expired' ? 'provider_timeout' : 'provider_failed', Date.now()); return {}; }
  const text = await agentHandoff(platform,()=>design.layoutDocument(layout));
  parseLayerDoc(text);
  const bytes = new TextEncoder().encode(text);
  await platform.blobs.put(designLayoutKey(job.id), bytes, { httpMetadata: { contentType: 'application/json' } });
  await repository.update(job.id, ['preparing'], { state: 'ready', layerdocSha256: await hex(bytes), attempts: 0, waitCode: null, retryAt: null }, Date.now());
  return {};
}

const permanent: Partial<Record<DesignProviderError['code'], DesignFailureCode>> = {
  provider_unauthorized: 'provider_unauthorized', provider_rejected: 'provider_rejected', provider_invalid: 'provider_invalid',
};

/** Runs one pass and decides what follows: call again, delay for the service's allowance, or fail with a safe code. */
export async function advanceDesignJob(platform: Platform, command: DesignCommand, now = Date.now()) {
  const repository = createDesignRepository(platform.database.$client);
  const job = await repository.get(String(command.payload.jobId ?? ''));
  const stage = command.kind === 'design.draft' ? 'drafting' : 'preparing';
  if (!job || job.state !== stage) return;
  if (job.deadlineAt < now) { await repository.fail(job.id, 'provider_timeout', now); return; }
  // A message that arrives before 12ui said to ask again asks nothing and comes back then.
  if (job.retryAt && job.retryAt > now + 1000) { await platform.jobs.retry(command, Math.ceil((job.retryAt - now) / 1000)); return; }
  // The module was switched off after the run started: nothing is constructed, so nothing is contacted.
  if (!platform.design) { await repository.fail(job.id, 'module_unavailable', now); return; }
  let pass: Pass;
  try {
    pass = command.kind === 'design.draft' ? await draftPass(platform, platform.design, job) : await layoutPass(platform, platform.design, job, now);
  } catch (error) {
    if (error instanceof DesignImportError) { await repository.fail(job.id, 'invalid_layout', Date.now()); return; }
    if (!(error instanceof DesignProviderError)) throw error;
    const code = permanent[error.code];
    if (code) { await repository.fail(job.id, code, Date.now()); return; }
    const at = Date.now();
    if (error.code === 'provider_quota') {
      // 12ui names when to ask again (a rate limit): the run waits that long, says so, and fails as the allowance if
      // that is past its deadline. Without a time (the daily allowance or the wallet is used up) it fails at once.
      const retryAt = error.retryAfterSeconds === undefined ? undefined : at + error.retryAfterSeconds * 1000;
      if (retryAt === undefined || retryAt > job.deadlineAt) { await repository.fail(job.id, 'provider_quota', at); return; }
      if (await repository.update(job.id, [stage], { waitCode: 'provider_quota', retryAt }, at)) await platform.jobs.retry(command, error.retryAfterSeconds!);
      return;
    }
    if (job.attempts + 1 >= transientAttempts) { await repository.fail(job.id, 'provider_unavailable', at); return; }
    const delay = backoffSeconds(job.attempts + 1);
    if (await repository.update(job.id, [stage], { attempts: job.attempts + 1, waitCode: 'provider_unavailable', retryAt: at + delay * 1000 }, at)) await platform.jobs.retry(command, delay);
    return;
  }
  if (pass.again === undefined) return;
  // 12ui answered: clear any wait, touch the run so the cron sweep sees it is alive, and hand the next pass to the queue.
  if (await repository.update(job.id, [stage], { waitCode: null, retryAt: null }, Date.now())) await platform.jobs.retry(command, pass.again);
}
