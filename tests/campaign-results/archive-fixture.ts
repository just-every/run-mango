import { seedCampaign, recipient, fixedNow } from './fixtures';
import { managedFooter } from '../../src/core/features/campaigns/authoring-content';
export async function seedArchive(db:D1Database,origin:string) {
  await seedCampaign(db,'orchard-letter','completed');
  await recipient(db,'orchard-letter',1,'delivered',null,{handedOffAt:fixedNow});
  const body=`<h2>A quieter kind of autumn</h2><p>Hello {{first_name | fallback: "Private fallback"}},</p><p>The orchard is settling into its golden season. We have fresh pears, a new batch of preserves, and a few notes from the harvest.</p><p><a href="https://shop.example.test/harvest?utm_source=newsletter">Explore this week’s harvest</a></p><p><a href="${origin}/l/private-click-token">Private tracking destination</a></p><img src="https://tracker.example.test/o/private-pixel" width="2" height="2" alt=""><p>See you at the farm stand,<br>The Orchard team</p>${managedFooter}`;
  await db.prepare('UPDATE campaign_revisions SET email_subject=?,preheader=?,sender_name=?,email_body=? WHERE id=?').bind('Harvest notes for {{first_name | fallback: "Private subject"}}','Fresh pears, small batches and a slower season.','Orchard & Co.',body,'orchard-letter-revision').run();
  await seedCampaign(db,'unsent-letter','draft');
  await seedCampaign(db,'empty-letter','completed');
  await seedCampaign(db,'confirmed-letter','completed');
  await recipient(db,'confirmed-letter',1,'delivered',null,{providerMessageId:'confirmed-after-uncertain',deliveredAt:fixedNow});
  return {body};
}
