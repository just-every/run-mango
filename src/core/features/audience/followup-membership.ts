/** Durable campaign references keep large follow-up audiences out of rule JSON.
 * The cutoff belongs to this new campaign; scanners never establish engagement.
 * A missing/erased source recipient never transfers authority to another person. */
export async function followupMember(db:D1Database,cohortId:string,contactId:string) {
  const row=await db.prepare(`SELECT 1 matched FROM campaign_followups f
    JOIN recipient_steps r ON r.campaign_id=f.source_campaign_id AND r.revision_id=f.source_revision_id
    WHERE f.id=? AND r.contact_id=? AND r.channel='email'
      AND (r.handed_off_at IS NOT NULL OR r.provider_accepted_at IS NOT NULL OR r.provider_message_id IS NOT NULL)
      AND COALESCE(r.handed_off_at,r.provider_accepted_at,r.handoff_started_at)<=f.cutoff_at
      AND ((f.metric='click' AND NOT EXISTS(SELECT 1 FROM link_click_facts l WHERE l.recipient_step_id=r.id AND l.automated=0 AND l.occurred_at<=f.cutoff_at))
        OR (f.metric='open-estimate' AND NOT EXISTS(SELECT 1 FROM open_estimate_facts o WHERE o.recipient_step_id=r.id AND o.occurred_at<=f.cutoff_at)))
      AND NOT EXISTS(SELECT 1 FROM recipient_steps other JOIN link_click_facts l ON l.recipient_step_id=other.id
        WHERE f.metric='click' AND other.campaign_id=f.source_campaign_id AND other.revision_id=f.source_revision_id
          AND other.channel='email' AND other.contact_id=r.contact_id AND l.automated=0 AND l.occurred_at<=f.cutoff_at)
      AND NOT EXISTS(SELECT 1 FROM recipient_steps other JOIN open_estimate_facts o ON o.recipient_step_id=other.id
        WHERE f.metric='open-estimate' AND other.campaign_id=f.source_campaign_id AND other.revision_id=f.source_revision_id
          AND other.channel='email' AND other.contact_id=r.contact_id AND o.occurred_at<=f.cutoff_at)
      LIMIT 1`).bind(cohortId,contactId).first();
  return Boolean(row);
}
