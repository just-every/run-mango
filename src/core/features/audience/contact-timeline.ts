type RecordedTime = Date | string | number;
export type ContactTimelineEntry = {
  id: string;
  kind: string;
  detail: string;
  source: string;
  occurredAt: string;
  campaignId?: string;
};
type Detail = {
  history: Array<{id:string;kind:string;detail:string;occurredAt:RecordedTime}>;
  consent: Array<{id:string;channel:string;captureMethod:string;captureSource:string;messageCategory:string;occurredAt:RecordedTime;confirmedAt:RecordedTime|null}>;
  suppressions: Array<{id:string;channel:string;cause:string;occurredAt:RecordedTime}>;
};
type Fact = Omit<ContactTimelineEntry, 'occurredAt'> & {occurredAt:number};
const identities = `WITH RECURSIVE identities(id) AS (
  SELECT ? UNION SELECT m.merged_contact_id FROM contact_merges m JOIN identities i ON m.survivor_contact_id=i.id
)`;

/** Source labels never carry a capture URL's credentials, query or fragment. */
function captureSource(source:string) {
  if(source.startsWith('Kiosk: '))return source;
  try {const url=new URL(source);return url.origin+url.pathname;}
  catch {return source;}
}
const milliseconds=(at:RecordedTime)=>at instanceof Date?at.getTime():new Date(at).getTime();

/** Read facts only. No provider payloads, message bodies, tokens or audit JSON enter this projection. */
export async function readContactTimeline(db:D1Database, contactId:string, detail:Detail):Promise<ContactTimelineEntry[]> {
  const [activity, decisions, transport, provider, clicks, actions] = await db.batch<Fact>([
    db.prepare(`${identities}
      SELECT 'source:'||a.id id, a.kind kind, a.kind||' · '||a.state detail,
        s.provider||' · '||s.source_type source, a.occurred_at occurredAt
      FROM source_activities a JOIN source_records s ON s.id=a.source_record_id
      WHERE a.contact_id IN (SELECT id FROM identities)`).bind(contactId),
    db.prepare(`${identities}
      SELECT 'eligible:'||c.id id, 'campaign-eligible' kind,
        v.name||' · included in the approved audience' detail, 'Campaign approval' source,
        c.matched_at occurredAt, v.campaign_id campaignId
      FROM campaign_revision_candidates c JOIN campaign_revisions v ON v.id=c.revision_id
      WHERE c.contact_id IN (SELECT id FROM identities)
      UNION ALL
      SELECT 'skipped:'||r.id, 'campaign-skipped',
        v.name||' · '||r.channel||' · '||r.skip_reason, 'Dispatch eligibility',
        r.terminal_at, r.campaign_id
      FROM recipient_steps r JOIN campaign_revisions v ON v.id=r.revision_id
      WHERE r.contact_id IN (SELECT id FROM identities) AND r.transport_disposition='skipped'
        AND r.terminal_at IS NOT NULL`).bind(contactId),
    db.prepare(`${identities}
      SELECT 'handoff:'||r.id id, 'message-handed-off' kind,
        v.name||' · '||r.channel||' · handed to provider; delivery not yet established' detail,
        COALESCE(r.provider,'Recorded transport') source, r.handed_off_at occurredAt, r.campaign_id campaignId
      FROM recipient_steps r JOIN campaign_revisions v ON v.id=r.revision_id
      WHERE r.contact_id IN (SELECT id FROM identities) AND r.handed_off_at IS NOT NULL
      UNION ALL
      SELECT 'failed:'||r.id, 'message-failed', v.name||' · '||r.channel||' · '||COALESCE(r.last_error_code,'failed'),
        COALESCE(r.provider,'Recorded transport'), r.terminal_at, r.campaign_id
      FROM recipient_steps r JOIN campaign_revisions v ON v.id=r.revision_id
      WHERE r.contact_id IN (SELECT id FROM identities) AND r.transport_disposition='failed'
        AND r.terminal_at IS NOT NULL`).bind(contactId),
    db.prepare(`${identities}
      SELECT 'provider:'||f.id id, 'message-'||f.kind kind,
        v.name||' · '||r.channel||' · '||f.kind detail, f.provider source,
        f.provider_occurred_at occurredAt, r.campaign_id campaignId
      FROM delivery_facts f JOIN recipient_steps r ON r.id=f.recipient_step_id
      JOIN campaign_revisions v ON v.id=r.revision_id
      WHERE r.contact_id IN (SELECT id FROM identities)`).bind(contactId),
    db.prepare(`${identities}
      SELECT 'click:'||f.id id, CASE WHEN f.automated=1 THEN 'automated-link-request' ELSE 'message-clicked' END kind,
        v.name||CASE WHEN f.automated=1 THEN ' · automated request, excluded from engagement' ELSE ' · tracked link clicked' END detail,
        'First-party link tracking' source, f.occurred_at occurredAt, r.campaign_id campaignId
      FROM link_click_facts f JOIN recipient_steps r ON r.id=f.recipient_step_id
      JOIN campaign_revisions v ON v.id=r.revision_id
      WHERE r.contact_id IN (SELECT id FROM identities)`).bind(contactId),
    db.prepare(`${identities}, revisions(id) AS (
      SELECT revision_id FROM campaign_revision_candidates WHERE contact_id IN (SELECT id FROM identities)
      UNION SELECT revision_id FROM recipient_steps WHERE contact_id IN (SELECT id FROM identities)
    ), related_campaigns(id) AS (SELECT campaign_id FROM campaign_revisions WHERE id IN (SELECT id FROM revisions))
      SELECT 'action:'||a.id id, 'operator-action' kind,
        a.action||' · '||COALESCE(o.display_name,a.actor_id) detail,
        CASE WHEN a.actor_type='operator' THEN 'Operator' ELSE a.actor_type END source,
        a.occurred_at occurredAt,
        CASE WHEN a.entity_type='campaign' THEN a.entity_id
          WHEN a.entity_type='campaign-revision' THEN (SELECT campaign_id FROM campaign_revisions WHERE id=a.entity_id) END campaignId
      FROM lifecycle_audit_entries a LEFT JOIN oa_operators o ON o.id=a.actor_id AND a.actor_type='operator'
      WHERE (a.entity_type='contact' AND a.entity_id IN (SELECT id FROM identities))
        OR (a.entity_type='campaign' AND a.entity_id IN (SELECT id FROM related_campaigns))
        OR (a.entity_type='campaign-revision' AND a.entity_id IN (SELECT id FROM revisions))
      UNION ALL
      SELECT 'transition:'||t.id, 'operator-action',
        v.name||' · '||t.from_state||' → '||t.to_state||' · '||COALESCE(o.display_name,t.actor_id),
        'Campaign history', t.occurred_at, t.campaign_id
      FROM campaign_state_transitions t JOIN campaigns c ON c.id=t.campaign_id
      JOIN campaign_revisions v ON v.id=c.active_revision_id
      LEFT JOIN oa_operators o ON o.id=t.actor_id
      WHERE t.actor_type='operator' AND t.campaign_id IN (SELECT id FROM related_campaigns)
        AND NOT EXISTS (SELECT 1 FROM lifecycle_audit_entries a WHERE a.actor_id=t.actor_id
          AND a.occurred_at=t.occurred_at AND (
            (a.entity_type='campaign' AND a.entity_id=t.campaign_id)
            OR (a.entity_type='campaign-revision' AND a.entity_id IN (SELECT id FROM campaign_revisions WHERE campaign_id=t.campaign_id))))
      UNION ALL
      SELECT 'merge:'||m.id, 'contact-merged', 'Contacts merged · '||COALESCE(o.display_name,m.operator_id,'Recorded merge'),
        'Operator', m.occurred_at, NULL
      FROM contact_merges m LEFT JOIN oa_operators o ON o.id=m.operator_id
      WHERE m.survivor_contact_id IN (SELECT id FROM identities)`).bind(contactId),
  ]);
  const entries:ContactTimelineEntry[]=[];
  const add=(entry:Omit<ContactTimelineEntry,'occurredAt'>,at:RecordedTime)=>entries.push({...entry,occurredAt:new Date(milliseconds(at)).toISOString()});
  // The old history response remains unchanged. Prefer the structured consent
  // facts in this timeline where a ledger row describes the same transition.
  const consentTimes=new Set(detail.consent.flatMap(c=>[
    `consent-captured:${milliseconds(c.occurredAt)}`,
    ...(c.confirmedAt?[`consent-confirmed:${milliseconds(c.confirmedAt)}`]:[]),
  ]));
  for(const row of detail.history) {
    if(consentTimes.has(`${row.kind}:${milliseconds(row.occurredAt)}`))continue;
    if(row.kind==='suppression'&&detail.suppressions.some(s=>s.cause===row.detail&&milliseconds(s.occurredAt)===milliseconds(row.occurredAt)))continue;
    if(row.kind==='contact-merged'&&actions.results.some(a=>a.kind==='contact-merged'&&a.occurredAt===milliseconds(row.occurredAt)))continue;
    add({id:`history:${row.id}`,kind:row.kind,detail:row.detail,source:'Contact ledger'},row.occurredAt);
  }
  for(const row of detail.consent) {
    const source=`${row.captureMethod} · ${captureSource(row.captureSource)}`;
    add({id:`consent:${row.id}`,kind:'consent-captured',detail:`${row.channel} · ${row.messageCategory}`,source},row.occurredAt);
    if(row.confirmedAt)add({id:`confirmation:${row.id}`,kind:'consent-confirmed',detail:`${row.channel} · ${row.messageCategory}`,source},row.confirmedAt);
  }
  for(const row of detail.suppressions)add({id:`suppression:${row.id}`,kind:'channel-suppressed',detail:`${row.channel} · ${row.cause}`,source:'Suppression ledger'},row.occurredAt);
  const imported=await db.prepare(`SELECT f.id,'imported-'||f.kind AS kind,h.title||' · imported '||CASE f.kind WHEN 'open' THEN 'open estimate' ELSE 'click' END AS detail,'Imported · '||f.source AS source,f.occurred_at AS occurredAt FROM imported_engagement_facts f JOIN move_in_content h ON h.id=f.history_id JOIN move_in_archives a ON a.id=f.archive_id WHERE f.contact_id=? AND a.state='applied'`).bind(contactId).all<Fact>();
  for(const result of [activity,decisions,transport,provider,clicks,actions,imported]) {
    for(const {occurredAt,...entry} of result.results)add(entry,occurredAt);
  }
  return entries.sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt)||a.id.localeCompare(b.id));
}
