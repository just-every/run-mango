import type { createBootstrapRepository } from './repository';

export type LocalSeedPlan = {
  id: string;
  operatorId: string;
  import: (now: Date) => Promise<void>;
};

export function createBootstrapService(
  repository: ReturnType<typeof createBootstrapRepository>,
  plan: LocalSeedPlan,
) {
  return {
    async seedLocal() {
      if (await repository.isApplied(plan.id)) return { applied: false, seedId: plan.id };
      const now = new Date();
      await plan.import(now);
      await repository.recordApplied(plan.id, now);
      return { applied: true, seedId: plan.id };
    },

    operatorId() {
      return plan.operatorId;
    },
  };
}
