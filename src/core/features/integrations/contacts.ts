import type { createAudienceService } from '@/core/features/audience/service';
import { sha256, stableJson } from '@/core/shared/ids';
import { IntegrationError, type ContactInput } from './schema';

type Segment = {id: string; name: string; contactCount: number};
type ContactRow = {id: string; email: string; displayName: string; emailStatus: string; fields: string; tags: string; segmentIds: string; createdAt: number; updatedAt: number};
const projection = `c.id,c.email,c.display_name AS displayName,c.email_status AS emailStatus,c.created_at AS createdAt,c.updated_at AS updatedAt,
  COALESCE(p.fields_json,'{}') AS fields,COALESCE(p.tags_json,'[]') AS tags,
  (SELECT json_group_array(m.segment_id) FROM integration_segment_members m WHERE m.contact_id=c.id) AS segmentIds`;
function project(row: ContactRow) { return {...row, fields: JSON.parse(row.fields), tags: JSON.parse(row.tags), segmentIds: JSON.parse(row.segmentIds)}; }

/** These saved lists use the native contact-ID rule, so review/approval sees the
 * real membership. Dynamic owner-authored segments are never rewritten. */
export function createIntegrationContacts(db: D1Database, audience: ReturnType<typeof createAudienceService>, salt: string) {
  async function ownedSegment(_credentialId: string, segmentId: string) {
    const row = await db.prepare(`SELECT s.segment_id AS id,s.name FROM integration_segments s JOIN audience_segments a ON a.id=s.segment_id
      WHERE s.segment_id=?`).bind(segmentId).first<{id: string; name: string}>();
    if (!row) throw new IntegrationError('integration_segment_not_found', 404);
    return row;
  }
  return {
    ownedSegment,
    async segments(_credentialId: string) {
      const segments = (await db.prepare(`SELECT s.segment_id AS id,a.name,COUNT(m.contact_id) AS contactCount FROM integration_segments s
        JOIN audience_segments a ON a.id=s.segment_id LEFT JOIN integration_segment_members m ON m.segment_id=s.segment_id
        GROUP BY s.segment_id ORDER BY a.name,s.segment_id`).all<Segment>()).results;
      return {segments};
    },
    async list(credentialId: string, query: {cursor?: string; email?: string; segmentId?: string; limit: number}) {
      if (query.segmentId) await ownedSegment(credentialId, query.segmentId);
      const rows = (await db.prepare(`SELECT ${projection} FROM contacts c LEFT JOIN integration_contact_profiles p ON p.contact_id=c.id
        WHERE c.id>? AND (? IS NULL OR EXISTS(SELECT 1 FROM contact_email_addresses a WHERE a.contact_id=c.id AND a.email=?))
        AND (? IS NULL OR EXISTS(SELECT 1 FROM integration_segment_members m WHERE m.contact_id=c.id AND m.segment_id=?))
        ORDER BY c.id LIMIT ?`).bind(query.cursor ?? '', query.email ?? null, query.email ?? null, query.segmentId ?? null, query.segmentId ?? null, query.limit).all<ContactRow>()).results;
      return {contacts: rows.map(project), nextCursor: rows.at(-1)?.id ?? query.cursor ?? ''};
    },
    async upsert(credentialId: string, input: ContactInput) {
      const now = Date.now();
      if (input.consent && Date.parse(input.consent.occurredAt) > now) throw new IntegrationError('consent_in_future', 400);
      if (input.segmentId) await ownedSegment(credentialId, input.segmentId);
      const segmentId = input.segmentId ?? `integration_${(await sha256(input.segmentName!)).slice(0, 40)}`;
      const {contact} = await audience.ensureContact({email: input.email, displayName: input.displayName}, new Date(now));
      if (contact.mergeLock) throw new IntegrationError('contact_merge_in_progress', 409);
      const statements: D1PreparedStatement[] = [];
      if (input.segmentName) {
        const emptyRule = JSON.stringify({version: 1, operator: 'all', predicates: [{sourceType: 'contact', field: 'id', comparator: 'in', value: [contact.id]}]});
        statements.push(db.prepare(`INSERT INTO audience_segments(id,name,inclusion_rule_json,exclusion_rules_json,created_by,created_at,updated_at)
          VALUES(?,?,?,'[]',?,?,?) ON CONFLICT(id) DO NOTHING`).bind(segmentId, input.segmentName, emptyRule, `integration:${credentialId}`, now, now),
        db.prepare('INSERT INTO integration_segments(segment_id,credential_id,name) VALUES(?,?,?) ON CONFLICT DO NOTHING').bind(segmentId, credentialId, input.segmentName));
      }
      statements.push(db.prepare('INSERT INTO integration_segment_members(segment_id,contact_id) VALUES(?,?) ON CONFLICT DO NOTHING').bind(segmentId, contact.id),
        db.prepare(`UPDATE audience_segments SET inclusion_rule_json=json_object('version',1,'operator','all','predicates',json_array(json_object(
          'sourceType','contact','field','id','comparator','in','value',json((SELECT json_group_array(contact_id) FROM
          (SELECT contact_id FROM integration_segment_members WHERE segment_id=? ORDER BY contact_id)))))),updated_at=? WHERE id=?`).bind(segmentId, now, segmentId),
        db.prepare(`INSERT INTO integration_contact_profiles(contact_id,fields_json,tags_json) VALUES(?,?,?) ON CONFLICT(contact_id)
          DO UPDATE SET fields_json=CASE WHEN ? THEN excluded.fields_json ELSE fields_json END,tags_json=CASE WHEN ? THEN excluded.tags_json ELSE tags_json END`)
          .bind(contact.id, JSON.stringify(input.fields ?? {}), JSON.stringify(input.tags ?? []), input.fields !== undefined ? 1 : 0, input.tags !== undefined ? 1 : 0));
      if (input.subscribe && input.consent) {
        const consent = input.consent, occurredAt = Date.parse(consent.occurredAt);
        const evidenceId = `integration-consent:${await sha256(stableJson({credentialId, email: input.email, consent}))}`;
        const hash = await sha256(`${salt}:${input.email}`);
        const eligible = `NOT EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=? AND channel='email')
          AND NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel='email')
          AND EXISTS(SELECT 1 FROM contacts WHERE id=? AND merge_lock IS NULL AND email_status NOT IN ('suppressed','unsubscribed'))
          AND EXISTS(SELECT 1 FROM contact_email_addresses WHERE contact_id=? AND email=? AND channel_status NOT IN ('suppressed','unsubscribed'))`;
        const params = [hash, hash, contact.id, contact.id, input.email];
        statements.push(db.prepare(`INSERT INTO consent_evidence(id,contact_id,channel,destination,brand_or_legal_sender,sms_program,message_category,
          frequency_disclosure,destination_jurisdiction,capture_method,capture_source,consent_text,consent_version,occurred_at,confirmation_required,confirmed_at,created_at,updated_at)
          VALUES(?,?,'email',?,?,NULL,?,?,?,'integration',?,?,?,?,0,?,?,?) ON CONFLICT(id) DO NOTHING`)
          .bind(evidenceId, contact.id, input.email, consent.brandOrLegalSender, consent.messageCategory, consent.frequencyDisclosure,
            consent.destinationJurisdiction, consent.source, consent.evidence, consent.consentVersion, occurredAt, occurredAt, now, now),
          db.prepare(`UPDATE contacts SET email_status='subscribed',email_status_at=MAX(COALESCE(email_status_at,0),?),last_activity_at=MAX(COALESCE(last_activity_at,0),?),updated_at=? WHERE id=? AND ${eligible}`)
            .bind(occurredAt, occurredAt, now, contact.id, ...params),
          db.prepare(`UPDATE contact_email_addresses SET channel_status='subscribed',channel_status_at=MAX(COALESCE(channel_status_at,0),?),updated_at=? WHERE contact_id=? AND email=? AND ${eligible}`)
            .bind(occurredAt, now, contact.id, input.email, ...params),
          db.prepare(`INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at) VALUES(?,?,'consent-captured','Email consent captured through integration.',?,?,?) ON CONFLICT(id) DO NOTHING`)
            .bind(`${evidenceId}:captured`, contact.id, occurredAt, now, now));
      }
      await db.batch(statements);
      const row = await db.prepare(`SELECT ${projection} FROM contacts c LEFT JOIN integration_contact_profiles p ON p.contact_id=c.id WHERE c.id=?`).bind(contact.id).first<ContactRow>();
      if (!row) throw new IntegrationError('contact_changed', 409);
      return {contact: project(row)};
    },
  };
}
