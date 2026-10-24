import { EmailTooLargeError } from '@/core/features/campaigns/email-size';
import { ulid } from '@/core/shared/ids';
import type { Platform } from '@/core/shared/platform';
import { createDraft } from '@/core/features/campaigns/create-draft';
import type { ContentRecord } from './archive-content';
import { moveInContent } from './schema';

// Draft starters and imported history: creation commits with its content row, and undo
// removes a draft only while it is still exactly the imported, never-reviewed draft.

const senderDefaults = (platform: Platform) => {
  const sender = platform.config.mailSender;
  return { senderName: sender.displayName, fromEmail: sender.fromEmail, replyToEmail: sender.replyToEmail, physicalAddress: sender.physicalAddress };
};
const row = (archiveId: string, record: ContentRecord, at: number) => ({
  id: ulid(at), archiveId, ordinal: record.ordinal, kind: record.kind, sourcePath: record.sourcePath, sourceRow: record.sourceRow,
  sourceCampaignId: record.sourceCampaignId, title: record.title, subject: record.subject, sentAtSource: record.sentAt, html: record.html, text: record.text,
  removedJson: JSON.stringify(record.removed), flaggedJson: JSON.stringify(record.flagged), mergeTagsJson: JSON.stringify(record.mergeTags),
  state: 'imported', createdAt: at, updatedAt: at,
});

/** One record per call; a record already written for this archive and ordinal is left as it is. */
export async function writeContent(platform: Platform, archiveId: string, record: ContentRecord, operatorId: string) {
  const db = platform.database;
  if (await db.$client.prepare('SELECT 1 FROM move_in_content WHERE archive_id=? AND ordinal=?').bind(archiveId, record.ordinal).first()) return;
  const at = Date.now();
  if (record.kind === 'history') { await db.insert(moveInContent).values(row(archiveId, record, at)).onConflictDoNothing(); return; }
  try { await createDraft(db, { ...senderDefaults(platform), name: record.title, emailSubject: record.subject, emailBody: record.html }, operatorId,
    draft => [db.insert(moveInContent).values({ ...row(archiveId, record, at), campaignId: draft.campaignId, revisionId: draft.revisionId, revisionUpdatedAt: draft.createdAt.getTime() })], {publicBaseUrl:platform.config.publicBaseUrl.toString(),openTrackingEnabled:true});
  } catch (error) {
    if (!(error instanceof EmailTooLargeError)) throw error;
    // A held conversion is source custody, never a campaign revision. The
    // ordinary content row lets continuation, reconciliation and undo finish.
    await db.insert(moveInContent).values({...row(archiveId,record,at),outcome:`Held conversion: ${error.message} The original file is retained in this archive. Reduce it in the source file and import it again.`}).onConflictDoNothing();
  }
}

/** Copy one imported history record into a new, ordinary draft. */
export async function copyHistory(platform: Platform, id: string, operatorId: string) {
  const record = await platform.database.$client.prepare("SELECT title,subject,html FROM move_in_content WHERE id=? AND kind='history' AND state='imported'").bind(id).first<{ title: string; subject: string; html: string }>();
  if (!record) return undefined;
  return createDraft(platform.database, { ...senderDefaults(platform), name: record.title, emailSubject: record.subject, emailBody: record.html }, operatorId, undefined, {publicBaseUrl:platform.config.publicBaseUrl.toString(),openTrackingEnabled:true});
}

const untouched = `EXISTS(SELECT 1 FROM campaigns c JOIN campaign_revisions r ON r.id=c.active_revision_id WHERE c.id=?1 AND c.state='draft' AND r.id=?2 AND r.updated_at=?3)
  AND (SELECT count(*) FROM campaign_revisions WHERE campaign_id=?1)=1
  AND NOT EXISTS(SELECT 1 FROM campaign_state_transitions WHERE campaign_id=?1 AND reason<>'draft-created')
  AND NOT EXISTS(SELECT 1 FROM campaign_approval_requests WHERE campaign_id=?1) AND NOT EXISTS(SELECT 1 FROM recipient_steps WHERE campaign_id=?1)
  AND NOT EXISTS(SELECT 1 FROM campaign_results WHERE campaign_id=?1) AND NOT EXISTS(SELECT 1 FROM campaign_channel_pauses WHERE campaign_id=?1)
  AND NOT EXISTS(SELECT 1 FROM proposals WHERE campaign_id=?1) AND NOT EXISTS(SELECT 1 FROM campaign_audiences WHERE revision_id=?2)
  AND NOT EXISTS(SELECT 1 FROM campaign_checks WHERE revision_id=?2) AND NOT EXISTS(SELECT 1 FROM campaign_revision_candidates WHERE revision_id=?2)
  AND NOT EXISTS(SELECT 1 FROM campaign_steps WHERE revision_id=?2)`;

async function keptReason(db: D1Database, campaignId: string, revisionId: string, updatedAt: number) {
  const campaign = await db.prepare('SELECT c.state,c.active_revision_id AS active,r.updated_at AS updated FROM campaigns c LEFT JOIN campaign_revisions r ON r.id=?2 WHERE c.id=?1').bind(campaignId, revisionId).first<{ state: string; active: string; updated: number | null }>();
  if (!campaign) return 'No longer present in Mango.';
  if (campaign.state !== 'draft' || await db.prepare('SELECT 1 FROM campaign_approval_requests WHERE campaign_id=? UNION ALL SELECT 1 FROM recipient_steps WHERE campaign_id=?').bind(campaignId, campaignId).first()) {
    return `Approved, scheduled or sent after the import (now ${campaign.state.replaceAll('-', ' ')}).`;
  }
  if (campaign.active !== revisionId || campaign.updated !== updatedAt) return 'Edited after the import.';
  return 'Reviewed or given a send step after the import.';
}

/** Undo one content record. History is read-only, so it is always removed; a draft only when untouched. */
export async function undoContent(db: D1Database, record: { id: string; kind: string; campaign_id: string | null; revision_id: string | null; revision_updated_at: number | null }) {
  const at = Date.now();
  if (record.kind === 'history' || !record.campaign_id) {
    await db.prepare("UPDATE move_in_content SET state='removed',outcome='Removed: unchanged since the import.',html='',text='',updated_at=? WHERE id=? AND state='imported'").bind(at, record.id).run();
    return;
  }
  const [campaignId, revisionId, updatedAt] = [record.campaign_id!, record.revision_id!, record.revision_updated_at!];
  const reason = await keptReason(db, campaignId, revisionId, updatedAt);
  const removed = "EXISTS(SELECT 1 FROM move_in_content WHERE id=?4 AND state='removed')";
  await db.batch([
    db.prepare(`UPDATE move_in_content SET state='removed',outcome='Removed: unchanged since the import.',updated_at=?5 WHERE id=?4 AND state='imported' AND ${untouched}`).bind(campaignId, revisionId, updatedAt, record.id, at),
    db.prepare(`DELETE FROM campaign_revision_links WHERE revision_id=?2 AND ${removed}`).bind(campaignId, revisionId, updatedAt, record.id),
    db.prepare(`DELETE FROM campaign_state_transitions WHERE campaign_id=?1 AND ${removed}`).bind(campaignId, revisionId, updatedAt, record.id),
    db.prepare(`DELETE FROM campaign_revisions WHERE id=?2 AND ${removed}`).bind(campaignId, revisionId, updatedAt, record.id),
    db.prepare(`DELETE FROM campaigns WHERE id=?1 AND ${removed}`).bind(campaignId, revisionId, updatedAt, record.id),
    db.prepare("UPDATE move_in_content SET state='kept',outcome=?,updated_at=? WHERE id=? AND state='imported'").bind(`Kept: ${reason}`, at, record.id),
  ]);
}
