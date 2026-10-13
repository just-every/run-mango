import { testIdentity } from './test-identity';
import { createBootstrapRepository } from '@/core/features/bootstrap/repository';
import { createLocalBootstrapRoutes } from './bootstrap-routes';
import { sampleData } from '@/core/features/bootstrap/sample-data';
import { createBootstrapService } from '@/core/features/bootstrap/service';
import { createCampaignDemoImportRepository } from '@/core/features/campaigns/demo-import-repository';
import { createCampaignDemoImportService } from '@/core/features/campaigns/demo-import-service';
import type { Platform, AppBindings } from '@/core/shared/platform';
import { createFixturePlatform } from './local-platform';

import { createApp } from '../../src/core/app/app';
import { mountDevelopmentOutbox } from '../../src/core/app/development-outbox';

export interface LocalAppBindings extends AppBindings {
  LOCAL_BOOTSTRAP_TOKEN: string;
}

export function createLocalApp(environment: LocalAppBindings, suppliedPlatform?: Platform) {
  if (!environment.LOCAL_BOOTSTRAP_TOKEN) {
    throw new Error('LOCAL_BOOTSTRAP_TOKEN is required by the local Worker entrypoint.');
  }

  const platform = suppliedPlatform ?? createFixturePlatform(environment, environment.LOCAL_BOOTSTRAP_TOKEN);
  return createApp(environment, platform, (app, { authService, audienceService, storeService }) => {
    mountDevelopmentOutbox(app, environment, platform);
    const database = platform.database;
    const campaignDemoImport = createCampaignDemoImportService(
      createCampaignDemoImportRepository(database),
    );
    const bootstrapService = createBootstrapService(createBootstrapRepository(database), {
      id: sampleData.id,
      operatorId: sampleData.operator.id,
      async import(now) {
        await testIdentity(platform).importLocalDemoOperator(sampleData.operator, now);
        await storeService.importLocalDemo(sampleData.providerCapabilities, sampleData.sourceSyncs, now);
        await audienceService.importLocalDemo(sampleData.contacts, now);
        const contacts = await audienceService.localDemoContacts(
          sampleData.contacts.map((contact) => contact.id),
        );
        await campaignDemoImport.importLocalDemo(
          {
            audience: sampleData.audience,
            campaigns: sampleData.campaigns,
            proposals: sampleData.proposals,
          },
          contacts,
          now,
        );
      },
    });
    app.route(
      '/api',
      createLocalBootstrapRoutes(environment.LOCAL_BOOTSTRAP_TOKEN, bootstrapService, { ...authService, ...testIdentity(platform) }),
    );
  }, true);
}
