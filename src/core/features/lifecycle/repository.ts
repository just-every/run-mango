import type { Database } from '@/core/platform/db/client';

import { createAdvisoryAcknowledgementRepository } from './advisory-acknowledgements';
import { createCampaignLifecycleRepository } from './campaign-repository';
import { createDeliveryFactRepository } from './delivery-fact-repository';
import { createRecipientLifecycleRepository } from './recipient-repository';

export type { ApprovalCheck } from './campaign-repository';

export function createLifecycleRepository(database: Database) {
  return {
    ...createAdvisoryAcknowledgementRepository(database),
    ...createCampaignLifecycleRepository(database),
    ...createRecipientLifecycleRepository(database),
    ...createDeliveryFactRepository(database),
  };
}

export type LifecycleRepository = ReturnType<typeof createLifecycleRepository>;
