import {agentAttribution} from '../agent-door/context';
import {actorType,actorId} from '../agent-door/custody';
import { neutralText, publicBody } from './public-content';
export type PublicIssue = { id: string; title: string; description: string; sender: string; body: string; sentAt: number; publishedAt: number };
type StoredIssue = {id:string;title:string;description:string;sender:string;body:string;sent_at:number;published_at:number};
const issue = (row: StoredIssue): PublicIssue => ({id:row.id,title:row.title,description:row.description,sender:row.sender,body:row.body,sentAt:row.sent_at,publishedAt:row.published_at});
export function archiveService(db: D1Database, origin: string) {
  return {
    async list(page=0,limit=50) {
      // No contact identity, private campaign ID, tokens or recipient payload enters this public projection.
      return (await db.prepare('SELECT id,title,description,sender,sent_at,published_at FROM newsletter_archive ORDER BY published_at DESC,id LIMIT ? OFFSET ?').bind(limit+1,page*limit).all<StoredIssue>()).results.map(row => {const {body,...summary}=issue(row);return summary;});
    },
    async read(id:string) { const row=await db.prepare('SELECT id,title,description,sender,body,sent_at,published_at FROM newsletter_archive WHERE id=?').bind(id).first<StoredIssue>(); return row ? issue(row) : null; },
    async status(campaignId:string) {return db.prepare('SELECT id,revision_id AS revisionId,published_at AS publishedAt FROM newsletter_archive WHERE campaign_id=? ORDER BY published_at DESC').bind(campaignId).all();},
    async publish(campaignId:string, revisionId:string, actor:string) {
      const revision=await db.prepare(`SELECT r.email_subject,r.preheader,r.sender_name,r.email_body,
        (SELECT MIN(COALESCE(s.handed_off_at,s.provider_accepted_at,s.delivered_at,(SELECT MIN(f.provider_occurred_at) FROM delivery_facts f WHERE f.recipient_step_id=s.id AND f.kind IN ('accepted','delivered','bounced')))) FROM recipient_steps s WHERE s.revision_id=r.id AND s.channel='email') AS sent_at
        FROM campaign_revisions r JOIN campaigns c ON c.id=r.campaign_id
        WHERE c.id=? AND c.state='completed' AND r.id=? AND r.state='approved'`)
        .bind(campaignId,revisionId).first<{email_subject:string;preheader:string;sender_name:string;email_body:string;sent_at:number|null}>();
      if(!revision||revision.sent_at===null)return null;
      const now=Date.now(), id=crypto.randomUUID();
      const body=publicBody(revision.email_body,origin);
      await db.batch([
        db.prepare('INSERT OR IGNORE INTO newsletter_archive(id,campaign_id,revision_id,title,description,sender,body,sent_at,published_at) VALUES(?,?,?,?,?,?,?,?,?)')
          .bind(id,campaignId,revisionId,neutralText(revision.email_subject),neutralText(revision.preheader),neutralText(revision.sender_name+(agentAttribution()?' · '+agentAttribution()!.label:'')),body,revision.sent_at,now),
        db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,actor_type,actor_id,action,entity_type,entity_id,detail_json,occurred_at,created_at) SELECT ?,?,'${actorType()}',?,'newsletter.published','campaign',?,json_object('revisionId',?,'archiveId',?),?,? WHERE EXISTS(SELECT 1 FROM newsletter_archive WHERE id=?)`)
          .bind(crypto.randomUUID(),crypto.randomUUID(),actorId(actor),campaignId,revisionId,id,now,now,id),
      ]);
      return db.prepare('SELECT id FROM newsletter_archive WHERE revision_id=?').bind(revisionId).first<{id:string}>();
    },
    async remove(campaignId:string,id:string,actor:string) {
      const now=Date.now();
      await db.batch([
        db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,actor_type,actor_id,action,entity_type,entity_id,detail_json,occurred_at,created_at) SELECT ?,?,'${actorType()}',?,'newsletter.unpublished','campaign',?,json_object('archiveId',id),?,? FROM newsletter_archive WHERE id=? AND campaign_id=?`).bind(crypto.randomUUID(),crypto.randomUUID(),actorId(actor),campaignId,now,now,id,campaignId),
        db.prepare('DELETE FROM newsletter_archive WHERE id=? AND campaign_id=?').bind(id,campaignId),
      ]);
    },
  };
}
