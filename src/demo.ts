import type { AppBindings } from './core/shared/platform';
import { createProductionPlatform } from './core/platform/runtime';
import { createAppServices } from './core/app/app';
import { createCampaignDemoImportRepository } from './core/features/campaigns/demo-import-repository';
import { createCampaignDemoImportService } from './core/features/campaigns/demo-import-service';

/** Real editable sample records; admission remains the native owner/session flow. */
export async function seedDemo(env: AppBindings, { ownerEmail, now }: { ownerEmail: string; now: Date }) {
  if (env.RER_DEMO !== '1') throw new Error('Sample demo data requires demo mode.');
  const db = env.DB;
  if (await db.prepare("SELECT 1 FROM seed_runs WHERE id='mango-visitor-demo-v1'").first()) return;
  const owner = await db.prepare('SELECT id FROM oa_operators WHERE email=? AND status=\'active\'').bind(ownerEmail).first<{ id: string }>();
  if (!owner) throw new Error('Demo owner is missing.');
  const [{ sampleData }, { seedDemoHistory }] = await Promise.all([
    import('./core/features/bootstrap/sample-data'),
    import('./core/features/bootstrap/demo-history'),
  ]);
  const platform = createProductionPlatform(env);
  const { audienceService, storeService } = createAppServices(platform);
  await storeService.importLocalDemo(sampleData.providerCapabilities, sampleData.sourceSyncs, now);
  await audienceService.importLocalDemo(sampleData.contacts, now);
  const contacts = await audienceService.localDemoContacts(sampleData.contacts.map(contact => contact.id));
  const importer = createCampaignDemoImportService(createCampaignDemoImportRepository(platform.database));
  const drafts = [
    ['October arrivals', 'Meet the newest pieces in store', 'Our October collection is here. Find thoughtful pieces for the everyday, selected by the Mango Sample Store team.'],
    ['A thank-you for our subscribers', 'A little thank-you from us', 'Thanks for being part of our community. Here is a first look at what we have been working on this month.'],
    ['The weekend edit', 'Make a little room for the weekend', 'Three ideas for a slower weekend: revisit a favourite, try something new, and share a little inspiration with a friend.'],
    ['Behind the scenes', 'A note from the Mango team', 'Come behind the scenes with us. This month we are sharing the stories and details behind our latest arrivals.'],
  ];
  await importer.importLocalDemo({ ...sampleData, proposals: [], campaigns: sampleData.campaigns.map((campaign, index) => {
    const [name, emailSubject, copy] = drafts[index % drafts.length];
    return { ...campaign, proposalId: undefined, state: 'draft' as const, revision: { ...campaign.revision, name, emailSubject,
      emailBody: `<h1>${emailSubject}</h1><p>Hello {{displayName|fallback:friend}},</p><p>${copy}</p>`, emailText: copy,
      smsBody: `${emailSubject}. Reply STOP to unsubscribe.`, smsSender: 'MangoSample',
      links: [{ label: 'Explore the collection', destinationUrl: 'https://example.test/collection' }],
      steps: campaign.revision.steps.map(step => ({ ...step, schedule: { ...step.schedule, whyThisTime: 'Planned for the next newsletter. Review and approve the saved revision before it can send.' } })) } };
  }) }, contacts, now);
  await seedDemoHistory(platform, owner.id, now);
  await db.prepare('INSERT OR IGNORE INTO seed_runs(id,applied_at) VALUES (?,?)').bind('mango-visitor-demo-v1', now.getTime()).run();
}
