import type { AppBindings } from './core/shared/platform';
import { createDemoPlatform } from './core/platform/worker-runtime';
import { createAppServices } from './core/app/app';
import { createCampaignDemoImportRepository } from './core/features/campaigns/demo-import-repository';
import { commerceSourceTypes } from './core/features/store/service';
import { normalizeAuthoredContent } from './core/features/campaigns/authoring-content';
import { demoLetterLinks } from './core/features/bootstrap/demo-links';
import { createCampaignDemoImportService } from './core/features/campaigns/demo-import-service';

/** Real editable sample records; admission remains the native owner/session flow. */
export async function seedDemo(env: AppBindings, { ownerEmail, now }: { ownerEmail: string; now: Date }) {
  if (env.RER_DEMO !== '1') throw new Error('Sample demo data requires demo mode.');
  const db = env.DB;
  if (await db.prepare("SELECT 1 FROM seed_runs WHERE id='mango-visitor-demo-v1'").first()) return;
  const owner = await db.prepare('SELECT id FROM oa_operators WHERE email=? AND status=\'active\'').bind(ownerEmail).first<{ id: string }>();
  if (!owner) throw new Error('Demo owner is missing.');
  const [{ sampleData }, { seedDemoHistory }, { seedDemoAudience }] = await Promise.all([
    import('./core/features/bootstrap/sample-data'),
    import('./core/features/bootstrap/demo-history'),
    import('./core/features/bootstrap/demo-audience'),
  ]);
  const platform = createDemoPlatform(env);
  const { audienceService, storeService } = createAppServices(platform);
  await storeService.importLocalDemo(sampleData.providerCapabilities.map(provider => ({ ...provider, configured: true, status: 'ready', detail: 'Provider is ready.' })), [], now);
  await storeService.recordSourceCapabilities(commerceSourceTypes.map(sourceType => ({ sourceType, available: platform.commerce!.capabilities().sourceTypes.includes(sourceType), detail: 'Sample store connection.' })), now);
  const seededSample = await seedDemoAudience(platform, audienceService, sampleData, now);
  const contacts = await audienceService.localDemoContacts(seededSample.contacts.map(contact => contact.id));
  const importer = createCampaignDemoImportService(createCampaignDemoImportRepository(platform.database));
  const links = demoLetterLinks(platform.config.publicBaseUrl);
  await importer.importLocalDemo({ ...sampleData, proposals: [], campaigns: sampleData.campaigns.map(campaign => {
    const { emailSubject, emailText } = campaign.revision;
    return { ...campaign, proposalId: undefined, state: 'draft' as const, revision: { ...campaign.revision, links,
      ...normalizeAuthoredContent({ emailBody: `<h1>${emailSubject}</h1><p>Hello {{displayName|fallback:friend}},</p><p>${emailText}</p>`, links }),
      steps: campaign.revision.steps } };
  }) }, contacts, now);
  await seedDemoHistory(platform, owner.id, now, seededSample);
  await db.prepare('INSERT OR IGNORE INTO seed_runs(id,applied_at) VALUES (?,?)').bind('mango-visitor-demo-v1', now.getTime()).run();
}
