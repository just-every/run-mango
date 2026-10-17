import type { Database } from '@/core/platform/db/client';

import { createCampaignControls } from './campaign-controls';
import { createAdvisoryAcknowledgementRepository } from './advisory-acknowledgements';
import { createCampaignLifecycleRepository } from './campaign-repository';
import { createDeliveryFactRepository } from './delivery-fact-repository';
import { createRecipientLifecycleRepository } from './recipient-repository';

export type { ApprovalCheck } from './campaign-repository';

export function createLifecycleRepository(database: Database) {
  return {
    controls: createCampaignControls(database),
    ...createAdvisoryAcknowledgementRepository(database),
    ...createCampaignLifecycleRepository(database),
    ...createRecipientLifecycleRepository(database),
    ...createDeliveryFactRepository(database),
  };
}

export type LifecycleRepository = ReturnType<typeof createLifecycleRepository>;
