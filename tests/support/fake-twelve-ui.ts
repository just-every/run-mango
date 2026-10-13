import { createHash } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

/** A stand-in for 12ui's hosted /api/v1 at the network edge (DESIGN-001..003 tests and evidence). It keeps the real
 * service's shapes: a create run claims slots, each candidate POST buys one image, a convert operation settles into a
 * LayerDoc with a published SHA-256. A repeated Idempotency-Key replays the first answer and buys nothing. */
export type FakeRequest = { method: string; path: string; authorized: boolean; idempotencyKey?: string; contentType?: string; json?: unknown; fields?: Record<string, string>; fileSha256?: string };
export type FakeOptions = {
  key: string;
  candidateImage: Uint8Array;
  /** A different image for some slots, such as real candidates for evidence. */
  slotImages?: Record<string, Uint8Array>;
  layerDoc: string;
  /** Milliseconds each slot takes to draw, by slot; default 0. Changeable while running with setDraw. */
  drawMs?: Record<string, number>;
  /** Slots whose purchase answers only once the image is drawn, as hosted 12ui's does. */
  holdDispatch?: string[];
  /** Slots whose drawing fails. */
  failedSlots?: string[];
  layoutMs?: number;
  /** How each new conversion settles; changeable while running with setLayoutStatus. */
  layoutStatus?: 'succeeded' | 'failed';
  /** Answer the first request to each listed path suffix with this status once. */
  failOnce?: Record<string, number>;
};
/** A refusal the next request to a path suffix gets: a status, and for 429 the Retry-After 12ui names, if any. */
export type Refusal = { status: number; retryAfter?: number };

export async function startFakeTwelveUi(options: FakeOptions) {
  const requests: FakeRequest[] = [];
  const purchases: string[] = [];
  const replies = new Map<string, unknown>();
  const runs = new Map<string, { slots: { slot: string; status: string; settles?: number }[] }>();
  const layouts = new Map<string, { settles: number; status: 'succeeded' | 'failed' }>();
  let layoutStatus = options.layoutStatus ?? 'succeeded';
  const failed = new Set<string>();
  const refusals = new Map<string, Refusal>();
  const inflations = new Map<string, number>();
  const drawMs = { ...options.drawMs };
  const layerDocSha = createHash('sha256').update(options.layerDoc).digest('hex');
  const now = () => Date.now();
  const runView = (id: string) => {
    const run = runs.get(id)!;
    for (const slot of run.slots) if (slot.status === 'dispatched' && slot.settles! <= now()) slot.status = options.failedSlots?.includes(slot.slot) ? 'failed' : 'succeeded';
    return { id, candidates: run.slots.map(({ slot, status }) => ({ slot, status })) };
  };
  const layoutView = (id: string) => {
    const layout = layouts.get(id)!;
    const status = layout.settles <= now() ? layout.status : 'running';
    return { id, status, output: 'layerdoc', model: 'fast', ...(status === 'succeeded' ? { result: { kind: 'layerdoc', media_type: 'application/vnd.12ui.layerdoc+json;version=2', sha256: layerDocSha, size_bytes: Buffer.byteLength(options.layerDoc) } } : {}) };
  };
  const server = http.createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);
    const path = new URL(request.url ?? '/', 'http://fake').pathname;
    const key = request.headers['idempotency-key'] as string | undefined;
    const entry: FakeRequest = { method: request.method ?? 'GET', path, authorized: request.headers.authorization === `Bearer ${options.key}`, ...(key ? { idempotencyKey: key } : {}), ...(request.headers['content-type'] ? { contentType: request.headers['content-type'] } : {}) };
    requests.push(entry);
    const send = (status: number, value: unknown, type = 'application/json', headers: Record<string, string> = {}) => {
      const inflation = type === 'application/json' && [...inflations].find(([suffix]) => `${entry.method} ${path}`.endsWith(suffix));
      if (inflation) {
        // The same answer with a padding field, streamed in chunks with no declared length.
        inflations.delete(inflation[0]);
        response.writeHead(status, { 'content-type': type });
        const chunk = 'x'.repeat(16 * 1024);
        response.write(`{"padding":"`);
        for (let sent = 0; sent < inflation[1]; sent += chunk.length) response.write(chunk);
        response.end(`",${JSON.stringify(value).slice(1)}`);
        return;
      }
      response.writeHead(status, { 'content-type': type, ...headers });
      response.end(type === 'application/json' ? JSON.stringify(value) : value as Uint8Array);
    };
    if (!entry.authorized) return send(401, { error: 'unauthorized', message: 'Missing or invalid API key.' });
    const injected = Object.entries(options.failOnce ?? {}).find(([suffix]) => `${entry.method} ${path}`.endsWith(suffix) && !failed.has(suffix));
    if (injected) { failed.add(injected[0]); return send(injected[1], { error: 'unavailable', message: 'Injected fake outage with provider wording that Mango must not show.' }); }
    const refusal = [...refusals].find(([suffix]) => `${entry.method} ${path}`.endsWith(suffix));
    if (refusal) {
      refusals.delete(refusal[0]);
      return send(refusal[1].status, { error: 'refused', message: 'Injected refusal with provider wording that Mango must not show.' }, 'application/json',
        refusal[1].retryAfter === undefined ? {} : { 'retry-after': String(refusal[1].retryAfter) });
    }
    const replay = key && replies.get(`${entry.method} ${path} ${key}`);
    if (replay) return send(200, typeof replay === 'function' ? (replay as () => unknown)() : replay);
    if (entry.method === 'POST' && path === '/api/v1/create') {
      entry.json = JSON.parse(body.toString('utf8'));
      const id = `crt-${createHash('sha256').update(key ?? String(Math.random())).digest('hex').slice(0, 16)}`;
      runs.set(id, { slots: (entry.json as { candidates: { slot: string }[] }).candidates.map(({ slot }) => ({ slot, status: 'pending' })) });
      if (key) replies.set(`POST ${path} ${key}`, () => runView(id));
      return send(201, runView(id));
    }
    const candidate = /^\/api\/v1\/create\/([^/]+)\/candidates\/([^/]+)(\/image)?$/.exec(path);
    if (candidate && runs.has(candidate[1])) {
      const slot = runs.get(candidate[1])!.slots.find(item => item.slot === candidate[2]);
      if (!slot) return send(404, { error: 'not_found' });
      if (candidate[3]) return slot.status === 'succeeded' ? send(200, options.slotImages?.[slot.slot] ?? options.candidateImage, 'image/png') : send(409, { error: 'not_ready' });
      if (entry.method !== 'POST') return send(405, {});
      purchases.push(`draft:${candidate[2]}:${key ?? ''}`);
      slot.status = 'dispatched'; slot.settles = now() + (drawMs[slot.slot] ?? 0);
      if (key) replies.set(`POST ${path} ${key}`, () => runView(candidate[1]));
      if (options.holdDispatch?.includes(slot.slot)) await new Promise(resolve => setTimeout(resolve, Math.max(0, slot.settles - now())));
      return send(200, runView(candidate[1]));
    }
    const run = /^\/api\/v1\/create\/([^/]+)$/.exec(path);
    if (run && runs.has(run[1])) return send(200, runView(run[1]));
    if (entry.method === 'POST' && path === '/api/v1/convert') {
      const form = await new Request('http://fake', { method: 'POST', headers: { 'content-type': entry.contentType ?? '' }, body }).formData();
      const file = form.get('file') as File;
      entry.fields = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === 'string')) as Record<string, string>;
      entry.fileSha256 = createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex');
      const id = `cnv-${createHash('sha256').update(key ?? String(Math.random())).digest('hex').slice(0, 16)}`;
      purchases.push(`layout:${key ?? ''}`);
      layouts.set(id, { settles: now() + (options.layoutMs ?? 0), status: layoutStatus });
      if (key) replies.set(`POST ${path} ${key}`, () => layoutView(id));
      return send(202, layoutView(id));
    }
    const layout = /^\/api\/v1\/convert\/([^/]+)$/.exec(path);
    if (layout && layouts.has(layout[1])) {
      if (request.headers.accept === 'application/octet-stream') return send(200, Buffer.from(options.layerDoc), 'application/vnd.12ui.layerdoc+json;version=2');
      return send(200, layoutView(layout[1]));
    }
    return send(404, { error: 'not_found' });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { origin, requests, purchases, refuseNext: (suffix: string, refusal: Refusal) => refusals.set(suffix, refusal),
    /** Pads the next JSON answer to a path suffix with at least `bytes` of padding. */
    inflateNext: (suffix: string, bytes: number) => inflations.set(suffix, bytes),
    setDraw: (slot: string, ms: number) => { drawMs[slot] = ms; }, setLayoutStatus: (status: 'succeeded' | 'failed') => { layoutStatus = status; }, close: () => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }) };
}
