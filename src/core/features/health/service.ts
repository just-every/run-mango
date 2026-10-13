import type { HealthRepository } from './repository';

export interface HealthService {
  check(): Promise<{ status: 'ok' }>;
}

export function createHealthService(repository: HealthRepository): HealthService {
  return {
    async check() {
      await repository.ping();
      return { status: 'ok' };
    },
  };
}
