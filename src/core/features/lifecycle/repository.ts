import type { EmailSizeOptions } from '@/core/features/campaigns/email-size';
import type { Database } from '@/core/platform/db/client';

import { createCampaignControls } from './campaign-controls';
import { createAdvisoryAcknowledgementRepository } from './advisory-acknowledgements';
import { createCampaignLifecycleRepository } from './campaign-repository';
import { createDeliveryFactRepository } from './delivery-fact-repository';
import { createRecipientLifecycleRepository } from './recipient-repository';

export type { ApprovalCheck } from './campaign-repository';

export function createLifecycleRepository(database: Database,sizeOptions:EmailSizeOptions = {}) {
  return {
    controls: createCampaignControls(database),
    ...createAdvisoryAcknowledgementRepository(database,sizeOptions),
    ...createCampaignLifecycleRepository(database),
    ...createRecipientLifecycleRepository(database),
    ...createDeliveryFactRepository(database),
  };
}

export type LifecycleRepository = ReturnType<typeof createLifecycleRepository>;
