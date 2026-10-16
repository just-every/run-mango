import type { Platform } from '@/core/shared/platform';
import type { SampleData } from './sample-data';
import { createCampaignDemoImportRepository } from '../campaigns/demo-import-repository';

export async function seedDemoHistory(platform: Platform, ownerId: string, now: Date, sampleData: SampleData) {
  const db = platform.database.$client, at = now.getTime(), past = at - 7 * 86400000;
  const identity = platform.config.mailSender;
  const rule = JSON.stringify({ version: 1, operator: 'all', predicates: [{ sourceType: 'contact', field: 'emailStatus', comparator: 'eq', value: 'subscribed' }] });
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO sender_settings(id,display_name,from_email,reply_to_email,physical_address,updated_by,created_at,updated_at)
      VALUES('business',?,?,?,?,?,?,?)`).bind(identity.displayName, identity.fromEmail, identity.replyToEmail, identity.physicalAddress, ownerId, at, at),
    db.prepare(`INSERT OR IGNORE INTO signup_settings(id,frequency_disclosure,updated_by,updated_at) VALUES('newsletter',?,?,?)`)
      .bind('A monthly note with new arrivals, store stories and subscriber offers.', ownerId, at),
    db.prepare(`INSERT OR IGNORE INTO audience_segments(id,name,inclusion_rule_json,exclusion_rules_json,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`)
      .bind('demo-subscribers', 'Newsletter subscribers', rule, '[]', ownerId, at, at),
    db.prepare(`INSERT OR IGNORE INTO audience_segments(id,name,inclusion_rule_json,exclusion_rules_json,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`)
      .bind('demo-unsubscribed', 'Unsubscribed contacts', rule.replace('"subscribed"', '"unsubscribed"'), '[]', ownerId, at, at),
  ]);
  // Give the existing bootstrap drafts the demo business identity and a native contact audience.
  for (const campaign of sampleData.campaigns) {
    await db.prepare(`UPDATE campaign_revisions SET sender_name=?,from_email=?,reply_to_email=?,physical_address=?,
      inclusion_rule_json=?,source_types_json='[]',message_category='newsletter',audience_rule='Newsletter subscribers',preheader='News and stories from Mango Sample Store.' WHERE id=?`)
      .bind(identity.displayName, identity.fromEmail, identity.replyToEmail, identity.physicalAddress, rule, campaign.revision.id).run();
    await db.prepare('DELETE FROM campaign_checks WHERE revision_id=?').bind(campaign.revision.id).run();
  }
  const original = sampleData.campaigns[0];
  const history = { ...original, id: 'demo-sent-newsletter', proposalId: undefined, state: 'draft' as const,
    revision: { ...original.revision, id: 'demo-sent-revision', name: 'September store notes · sample history',
      emailSubject: 'A little inspiration for your weekend',
      emailBody: '<h1>September store notes</h1><p>Hello {{displayName|fallback:friend}},</p><p>Meet our new collection and the people behind it. Thank you for being part of our community.</p>',
      emailText: 'Meet our new collection and the people behind it. Thank you for being part of our community.',
      smsBody: 'Our September collection is here. Reply STOP to unsubscribe.',
      links: [{ label: 'Explore the collection', destinationUrl: 'https://example.com/' }], senderName: identity.displayName,
      fromEmail: identity.fromEmail, replyToEmail: identity.replyToEmail,
      steps: [{ ...original.revision.steps[0], id: 'demo-sent-step', channel: 'email' as const, schedule: { ...original.revision.steps[0].schedule, whyThisTime: 'Sample newsletter sent last week.' } }] } };
  const recipients = sampleData.contacts.filter(contact => contact.emailStatus === 'subscribed');
  const snapshot = { candidateCount: recipients.length, eligibleCount: recipients.length, excludedCount: 0, exclusions: [],
    channelCounts: [{ channel: 'email' as const, recipientStepCount: recipients.length }] };
  await createCampaignDemoImportRepository(platform.database).importLocalDemoCampaign(history, 'Newsletter subscribers', snapshot, new Date(past));
  await db.batch([
    db.prepare("DELETE FROM campaign_checks WHERE revision_id='demo-sent-revision'"),
    db.prepare("UPDATE campaigns SET state='completed' WHERE id='demo-sent-newsletter'"),
    db.prepare("UPDATE campaign_revisions SET state='completed',inclusion_rule_json=?,source_types_json='[]',audience_rule='Newsletter subscribers' WHERE id='demo-sent-revision'").bind(rule),
    db.prepare("UPDATE campaign_steps SET scheduled_at=?,send_by_at=? WHERE id='demo-sent-step'").bind(past, past + 3600000),
    db.prepare("INSERT OR IGNORE INTO step_dispatches(step_id,revision_id,state,started_at,completed_at,created_at,updated_at) VALUES('demo-sent-step','demo-sent-revision','completed',?,?,?,?)").bind(past, past + 60000, past, past),
  ]);
  for (const contact of recipients) {
    const id = `demo-history-${contact.id}`;
    await db.prepare(`INSERT OR IGNORE INTO recipient_steps(id,campaign_id,revision_id,step_id,contact_id,contact_identity_key,channel,destination,idempotency_key,
      transport_disposition,provider,provider_message_id,provider_accepted_at,handed_off_at,send_by_at,terminal_at,created_at,updated_at)
      VALUES(?,'demo-sent-newsletter','demo-sent-revision','demo-sent-step',?,?,'email',?,?,'delivered','sample-history',?,?,?,?,?,?,?)`)
      .bind(id, contact.id, contact.id, contact.email, id, id, past, past, past + 3600000, past + 60000, past, past + 60000).run();
  }
}
