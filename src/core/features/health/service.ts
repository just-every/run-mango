import type { HealthRepository } from './repository';
import type { Platform } from '@/core/shared/platform';
import { healthProbeCommand } from './queue-probe';

type Dependency = 'database' | 'storage' | 'queue';
type ProbeFailure = { dependency: Dependency; code: 'unreachable' | 'timeout' };
type ProbeResult = { ms: number; slow: boolean; failure?: ProbeFailure };
type QueueDetail = { ms: number; slow: boolean; cached: boolean };
export type HealthResult = { status: 'ok'; ok: true; queue: QueueDetail }
  | { status: 'unavailable'; ok: false; failures: ProbeFailure[]; queue: QueueDetail };

// Concurrent probes leave 500 ms inside RER's two-second request budget.
const probeDeadlineMs = 1500;
const slowMs = 800;
const queueIntervalMs = 60_000;
const maxOutstandingQueueSends = 2;
type KeepAlive = (task: Promise<unknown>) => void;
type QueueProbe = { started: number; result: Promise<ProbeResult> };
// Binding identity survives per-request services. Cache is per Worker isolate,
// never shared across installations or deployment versions.
type QueueState = { outstanding: number; latest?: QueueProbe };
const queueProbes = new WeakMap<object, QueueState>();

function resultSince(started: number, failure?: ProbeFailure): ProbeResult {
  const ms = Date.now() - started;
  return { ms, slow: ms >= slowMs, ...(failure ? { failure } : {}) };
}

async function observe(dependency: Dependency, result: Promise<ProbeResult>): Promise<ProbeResult> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      result,
      new Promise<ProbeResult>((resolve) => {
        timer = setTimeout(() => resolve(resultSince(started, { dependency, code: 'timeout' })), probeDeadlineMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function probe(dependency: Dependency, operation: () => Promise<unknown>): Promise<ProbeResult> {
  const started = Date.now();
  return observe(dependency, Promise.resolve().then(operation).then(
    () => resultSince(started),
    () => resultSince(started, { dependency, code: 'unreachable' }),
  ));
}

function startQueueProbe(state: QueueState, operation: () => Promise<unknown>, keepAlive?: KeepAlive): QueueProbe {
  state.outstanding++;
  const started = Date.now();
  const send = Promise.resolve().then(operation).then(
    () => resultSince(started),
    () => resultSince(started, { dependency: 'queue', code: 'unreachable' }),
  ).finally(() => { state.outstanding--; });
  const entry = { started, result: observe('queue', send) };
  // Both the observation and slot release must survive the originating request.
  // Keeping only the bounded observation alive loses late send settlement on
  // workerd. The send has no retry timer and cannot overwrite a cached result.
  keepAlive?.(send);
  keepAlive?.(entry.result);
  return entry;
}

export interface HealthService {
  check(keepAlive?: KeepAlive): Promise<HealthResult>;
}

export function createHealthService(repository: HealthRepository, transports: Pick<Platform, 'blobs' | 'jobs'>,
  queueIdentity: object = transports.jobs): HealthService {
  return {
    async check(keepAlive) {
      let state = queueProbes.get(queueIdentity);
      if (!state) { state = { outstanding: 0 }; queueProbes.set(queueIdentity, state); }
      const previous = state.latest;
      const cached = Boolean(previous && (Date.now() - previous.started < queueIntervalMs
        || state.outstanding >= maxOutstandingQueueSends));
      // Expiry starts one fresh send even if an older send is unresolved. At the
      // cap, retain the failure without moving its expiry; the next request can
      // retry as soon as any outstanding send releases a slot.
      const queue = cached ? previous! : (state.latest = startQueueProbe(state, () => transports.jobs.enqueue(healthProbeCommand()), keepAlive));
      const results = await Promise.all([
        probe('database', () => repository.ping()),
        probe('storage', () => transports.blobs.head('__mango_health__/reachability')),
        // Every waiter owns a deadline in its own request context on workerd.
        observe('queue', queue.result),
      ]);
      const failures = results.flatMap(result => result.failure ? [result.failure] : []);
      const detail = { ms: results[2].ms, slow: results[2].slow, cached };
      return failures.length ? { status: 'unavailable', ok: false, failures, queue: detail }
        : { status: 'ok', ok: true, queue: detail };
    },
  };
}
