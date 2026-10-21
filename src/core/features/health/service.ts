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
// Binding identity survives per-request services. Cache is per Worker isolate,
// never shared across installations or deployment versions.
type QueueProbe = { started: number; pending: boolean; result: Promise<ProbeResult> };
const queueProbes = new WeakMap<object, QueueProbe>();

async function probe(dependency: Dependency, operation: () => Promise<unknown>): Promise<ProbeResult> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const failure = await Promise.race([
      Promise.resolve().then(operation).then(() => undefined, () => ({ dependency, code: 'unreachable' as const })),
      new Promise<ProbeFailure>((resolve) => {
        timer = setTimeout(() => resolve({ dependency, code: 'timeout' }), probeDeadlineMs);
      }),
    ]);
    const ms = Date.now() - started;
    return { ms, slow: ms >= slowMs, ...(failure ? { failure } : {}) };
  } finally {
    clearTimeout(timer);
  }
}

function startQueueProbe(operation: () => Promise<unknown>): QueueProbe {
  const entry: QueueProbe = {
    started: Date.now(), pending: true,
    result: probe('queue', async () => {
      try { await operation(); }
      finally { entry.pending = false; }
    }),
  };
  return entry;
}

export interface HealthService {
  check(): Promise<HealthResult>;
}

export function createHealthService(repository: HealthRepository, transports: Pick<Platform, 'blobs' | 'jobs'>,
  queueIdentity: object = transports.jobs): HealthService {
  return {
    async check() {
      const previous = queueProbes.get(queueIdentity), now = Date.now();
      const cached = Boolean(previous && (previous.pending || now - previous.started < queueIntervalMs));
      // The bounded observation and the actual send have separate lifetimes.
      // An overdue send retains ownership even after cache expiry; callers reuse
      // its timeout immediately. Late settlement only releases that entry, never
      // rewrites its result or extends its original cache interval. A never-settling
      // send remains retained once per binding; the transport is not cancelled.
      const queue = cached ? previous! : startQueueProbe(() => transports.jobs.enqueue(healthProbeCommand()));
      if (!cached) queueProbes.set(queueIdentity, queue);
      const results = await Promise.all([
        probe('database', () => repository.ping()),
        probe('storage', () => transports.blobs.head('__mango_health__/reachability')),
        queue.result,
      ]);
      const failures = results.flatMap(result => result.failure ? [result.failure] : []);
      const detail = { ms: results[2].ms, slow: results[2].slow, cached };
      return failures.length ? { status: 'unavailable', ok: false, failures, queue: detail }
        : { status: 'ok', ok: true, queue: detail };
    },
  };
}
