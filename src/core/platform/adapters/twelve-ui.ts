import { DesignProviderError, type DesignCandidateStatus, type DesignLayout, type DesignProvider, type DesignRun } from '@/core/shared/platform';

/** design.provider.v1 over 12ui's hosted `/api/v1` with plain fetch and the owner's own key (DESIGN-001..003).
 * Draft: POST /api/v1/create claims a run (buys nothing), POST …/candidates/<slot> buys one image, GET reads the run
 * and each image. Layout: POST /api/v1/convert (multipart, output=layerdoc, model=fast), GET reads the operation
 * and, once settled, its LayerDoc. Every POST carries the caller's Idempotency-Key, so a replay never buys twice. */
const layerDocMediaType = 'application/vnd.12ui.layerdoc+json;version=2';
const candidateStatuses = new Set<DesignCandidateStatus>(['pending', 'dispatched', 'succeeded', 'failed']);
const layoutStatuses = new Set<DesignLayout['status']>(['queued', 'running', 'succeeded', 'failed', 'expired']);
/** Every request has a deadline, so a service that stops answering fails the run within minutes (DESIGN-007).
 * A candidate POST answers once its image is drawn (about 45 s); past its deadline the next run read says what happened.
 * Images and the LayerDoc are downloads of up to 40 MB and 2 MB; every other request answers at once. */
const dispatchTimeoutMs = 150_000;
const downloadTimeoutMs = 60_000;
const requestTimeoutMs = 30_000;
/** The largest answer Mango reads: a candidate image, a LayerDoc, and any JSON answer (a run or a convert operation,
 * a few hundred bytes). A larger answer is refused before or while it streams. */
export const designDownloadLimits = { candidateBytes: 40 * 1024 * 1024, layoutBytes: 2 * 1024 * 1024, jsonBytes: 64 * 1024 } as const;
/** Redirects a read may follow, each on the configured origin only. */
const maxRedirects = 3;

function failure(response: Response) {
  const retryAfter = Number(response.headers.get('retry-after') ?? '');
  const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(3600, Math.round(retryAfter)) : undefined;
  if (response.status === 401 || response.status === 403) return new DesignProviderError('provider_unauthorized', response.status);
  // 402: the owner's 12ui wallet is empty; 429 with a time is a rate limit to wait out, without one the daily allowance is spent.
  if (response.status === 402) return new DesignProviderError('provider_quota', response.status);
  if (response.status === 429) return new DesignProviderError('provider_quota', response.status, seconds);
  if (response.status >= 500 || response.status === 408) return new DesignProviderError('provider_unavailable', response.status, seconds);
  return new DesignProviderError('provider_rejected', response.status);
}

const record = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

function parseRun(value: unknown): DesignRun {
  const run = record(value);
  const candidates = Array.isArray(run?.candidates) ? run.candidates.map(record) : undefined;
  if (typeof run?.id !== 'string' || !run.id || !candidates || candidates.some(item => typeof item?.slot !== 'string' || !candidateStatuses.has(item.status as DesignCandidateStatus))) {
    throw new DesignProviderError('provider_invalid', 0);
  }
  return { runId: run.id, candidates: candidates.map(item => ({ slot: item!.slot as string, status: item!.status as DesignCandidateStatus })) };
}

function parseLayout(value: unknown): DesignLayout {
  const operation = record(value), result = record(operation?.result);
  if (typeof operation?.id !== 'string' || !operation.id || !layoutStatuses.has(operation.status as DesignLayout['status'])) throw new DesignProviderError('provider_invalid', 0);
  const digest = typeof result?.sha256 === 'string' && /^[0-9a-f]{64}$/.test(result.sha256) ? result.sha256 : undefined;
  return { layoutId: operation.id, status: operation.status as DesignLayout['status'], ...(digest ? { resultSha256: digest } : {}) };
}

const timedOut = (error: unknown) => error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
/** Reads a response body under the request's deadline: running out of time is 12ui not answering, anything else an unreadable answer. */
async function body<T>(response: Response, read: (response: Response) => Promise<T>) {
  try { return await read(response); } catch (error) {
    if (error instanceof DesignProviderError) throw error;
    throw new DesignProviderError(timedOut(error) ? 'provider_unavailable' : 'provider_invalid', timedOut(error) ? 408 : response.status);
  }
}

/** Reads a body of at most `limit` bytes: a declared length over it is refused unread, and a stream that passes it
 * is cancelled there, so an oversized answer never fills the Worker's memory. */
async function capped(response: Response, limit: number) {
  const declared = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > limit) { await response.body?.cancel(); throw new DesignProviderError('provider_invalid', response.status); }
  if (!response.body) return new Uint8Array(0);
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { await reader.cancel(); throw new DesignProviderError('provider_invalid', response.status); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
  return bytes;
}

async function sha256(bytes: Uint8Array<ArrayBuffer>) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function createTwelveUiAdapter(options: { apiKey: string; origin: URL; fetch?: typeof fetch }): DesignProvider {
  const send = options.fetch ?? fetch;
  const base = options.origin.origin;
  // The key goes only to the configured origin: redirects are never followed by fetch, and a read follows one only
  // when it stays on that origin. A POST that answers with a redirect is refused.
  const request = async (path: string, init: RequestInit & { timeoutMs?: number }) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${options.apiKey}`);
    const signal = AbortSignal.timeout(init.timeoutMs ?? requestTimeoutMs);
    let url = `${base}${path}`, response: Response;
    for (let hops = 0; ; hops++) {
      try {
        response = await send(url, { ...init, headers, signal, redirect: 'manual' });
      } catch (error) {
        // Our own deadline reads as the service's 408: the request's outcome is unknown.
        throw new DesignProviderError('provider_unavailable', timedOut(error) ? 408 : 0);
      }
      if (response.status < 300 || response.status > 399) break;
      await response.body?.cancel();
      const location = response.headers.get('location');
      const next = location ? new URL(location, url) : undefined;
      if (!next || next.origin !== base || (init.method ?? 'GET') !== 'GET' || hops + 1 > maxRedirects) throw new DesignProviderError('provider_invalid', response.status);
      url = next.toString();
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw failure(response);
    }
    return response;
  };
  const json = async (path: string, init: RequestInit & { timeoutMs?: number } = {}) => {
    const response = await request(path, { ...init, headers: { Accept: 'application/json', ...init.headers } });
    const bytes = await body(response, answer => capped(answer, designDownloadLimits.jsonBytes));
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown; } catch { throw new DesignProviderError('provider_invalid', response.status); }
  };
  const run = (id: string) => `/api/v1/create/${encodeURIComponent(id)}`;

  return {
    provider: '12ui',
    async startDraft(input, idempotencyKey) {
      return parseRun(await json('/api/v1/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ concept: input.concept, aspect: 'portrait', mode: 'inspiration', candidates: input.slots.map(slot => ({ slot })) }),
      }));
    },
    async dispatchCandidate(runId, slot, idempotencyKey) {
      try {
        await json(`${run(runId)}/candidates/${encodeURIComponent(slot)}`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, timeoutMs: dispatchTimeoutMs });
        return 'dispatched';
      } catch (error) {
        // A timed-out purchase may still be drawing; the next run read says whether the slot is pending, running or settled.
        if (error instanceof DesignProviderError && error.status === 408) return 'unconfirmed';
        throw error;
      }
    },
    async readDraft(runId) {
      return parseRun(await json(run(runId)));
    },
    async candidateImage(runId, slot) {
      const response = await request(`${run(runId)}/candidates/${encodeURIComponent(slot)}/image`, { headers: { Accept: 'image/png' }, timeoutMs: downloadTimeoutMs });
      return body(response, answer => capped(answer, designDownloadLimits.candidateBytes));
    },
    async startLayout(image, idempotencyKey) {
      const form = new FormData();
      form.append('file', image, 'candidate.png');
      form.append('output', 'layerdoc');
      form.append('model', 'fast');
      return parseLayout(await json('/api/v1/convert', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: form }));
    },
    async readLayout(layoutId) {
      return parseLayout(await json(`/api/v1/convert/${encodeURIComponent(layoutId)}`));
    },
    async layoutDocument(layout) {
      const response = await request(`/api/v1/convert/${encodeURIComponent(layout.layoutId)}`, { headers: { Accept: layout.resultSha256 ? 'application/octet-stream' : layerDocMediaType }, timeoutMs: downloadTimeoutMs });
      const bytes = await body(response, answer => capped(answer, designDownloadLimits.layoutBytes));
      if (layout.resultSha256 && await sha256(bytes) !== layout.resultSha256) throw new DesignProviderError('provider_invalid', response.status);
      try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new DesignProviderError('provider_invalid', response.status); }
    },
  };
}
