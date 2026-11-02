export type AttributedOperator = {operatorId:string;operatorName:string|null;occurredAt:number};
export type CampaignAttribution = {
  campaignAuthor:AttributedOperator|null;
  agentAuthor?:{label:string}|null;
  revisionApprover:AttributedOperator|null;
  agentAuthorization?:{label:string;agentId:string;sponsorId:string;approvers:Array<{id:string;name:string}>}|null;
};

/** Historical profiles survive removal; native operator status grants no authority here. */
export async function campaignAttribution(db:D1Database,campaignId:string,revisionId:string):Promise<CampaignAttribution> {
  const [author,approver]=await db.batch([
    db.prepare(`SELECT t.actor_id AS operatorId,o.display_name AS operatorName,t.occurred_at AS occurredAt
      FROM campaign_state_transitions t LEFT JOIN operators o ON o.id=t.actor_id
      WHERE t.campaign_id=? AND t.actor_type='operator' AND t.reason='draft-created'
      ORDER BY t.occurred_at,t.id LIMIT 1`).bind(campaignId),
    db.prepare(`SELECT r.approved_by_operator_id AS operatorId,o.display_name AS operatorName,r.approved_at AS occurredAt
      FROM campaign_revisions r LEFT JOIN operators o ON o.id=r.approved_by_operator_id
      WHERE r.id=? AND r.campaign_id=? AND r.approved_by_operator_id IS NOT NULL`).bind(revisionId,campaignId),
  ]);
  const agent=await db.prepare('SELECT authorized_by_agent_id,agent_sponsor_id,agent_approvers_json FROM campaign_revisions WHERE id=? AND campaign_id=?').bind(revisionId,campaignId).first<{authorized_by_agent_id:string|null;agent_sponsor_id:string|null;agent_approvers_json:string|null}>();
  const work=agent?.authorized_by_agent_id?await db.prepare("SELECT attribution_json FROM mango_agent_work WHERE kind='campaign' AND target_id=?").bind(revisionId).first<{attribution_json:string}>():null;
  const attribution=work?JSON.parse(work.attribution_json):null;
  const authored=await db.prepare("SELECT detail_json FROM lifecycle_audit_entries WHERE action='mango.campaigns.create' AND actor_type='agent' AND entity_id=? ORDER BY occurred_at,id LIMIT 1").bind(campaignId).first<{detail_json:string}>();
  const prepared=authored?JSON.parse(authored.detail_json)?.preparedBy:null;
  return {agentAuthor:prepared?.label?{label:prepared.label}:null,agentAuthorization:attribution?{label:attribution.label,agentId:agent!.authorized_by_agent_id!,sponsorId:agent!.agent_sponsor_id!,approvers:JSON.parse(agent!.agent_approvers_json??'[]')}:null,campaignAuthor:(author.results[0] as AttributedOperator|undefined)??null,
    revisionApprover:(approver.results[0] as AttributedOperator|undefined)??null};
}
