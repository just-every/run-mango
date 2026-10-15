import type { HealthRepository } from './repository';
import type { Platform } from '@/core/shared/platform';
import { healthProbeCommand } from './queue-probe';

type Dependency = 'database' | 'storage' | 'queue';
type ProbeFailure = { dependency: Dependency; code: 'unreachable' | 'timeout' };
export type HealthResult = { status: 'ok'; ok: true } | { status: 'unavailable'; ok: false; failures: ProbeFailure[] };

// Reserve time for route serialization and Worker dispatch inside the one-second contract.
const probeDeadlineMs = 800;

async function probe(dependency: Dependency, operation: () => Promise<unknown>): Promise<ProbeFailure | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(operation).then(() => undefined, () => ({ dependency, code: 'unreachable' as const })),
      new Promise<ProbeFailure>((resolve) => {
        timer = setTimeout(() => resolve({ dependency, code: 'timeout' }), probeDeadlineMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export interface HealthService {
  check(): Promise<HealthResult>;
}

export function createHealthService(repository: HealthRepository, transports: Pick<Platform, 'blobs' | 'jobs'>): HealthService {
  return {
    async check() {
      const results = await Promise.all([
        probe('database', () => repository.ping()),
        // A read of a reserved, absent object exercises R2 without creating data.
        probe('storage', () => transports.blobs.head('__mango_health__/reachability')),
        // Queue send acknowledgment proves transport acceptance, not consumer readiness.
        probe('queue', () => transports.jobs.enqueue(healthProbeCommand())),
      ]);
      const failures = results.filter((result): result is ProbeFailure => result !== undefined);
      return failures.length ? { status: 'unavailable', ok: false, failures } : { status: 'ok', ok: true };
    },
  };
}
