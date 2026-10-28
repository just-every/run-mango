import type {PreparedBy} from '@/vendor/base/agent-door/index.ts';
export type AttributedOperator = {operatorId:string;operatorName:string|null;occurredAt:number};
export type CampaignAttribution = {
  campaignAuthor:AttributedOperator|null;
  revisionApprover:AttributedOperator|null;
  agentPreparer?:PreparedBy;
  approvers?:Array<{id:string;name:string}>;
};

/** Historical profiles survive removal; native operator status grants no authority here. */
export async function campaignAttribution(db:D1Database,campaignId:string,revisionId:string):Promise<CampaignAttribution> {
  const [author,approver]=await db.batch([
    db.prepare(`SELECT t.actor_id AS operatorId,CASE WHEN t.actor_type='agent' THEN a.name||' for '||a.sponsor_name ELSE o.display_name END AS operatorName,t.occurred_at AS occurredAt
      FROM campaign_state_transitions t LEFT JOIN operators o ON o.id=t.actor_id
      LEFT JOIN agent_door_agents a ON a.id=t.actor_id AND t.actor_type='agent'
      WHERE t.campaign_id=? AND t.actor_type IN ('operator','agent') AND t.reason='draft-created'
      ORDER BY t.occurred_at,t.id LIMIT 1`).bind(campaignId),
    db.prepare(`SELECT r.approved_by_operator_id AS operatorId,o.display_name AS operatorName,r.approved_at AS occurredAt
      FROM campaign_revisions r LEFT JOIN operators o ON o.id=r.approved_by_operator_id
      WHERE r.id=? AND r.campaign_id=? AND r.approved_by_operator_id IS NOT NULL`).bind(revisionId,campaignId),
  ]);
  const custody=await db.prepare("SELECT prepared_by_json,approvers_json FROM mango_agent_custody WHERE kind='campaign' AND target_id=?").bind(revisionId).first<{prepared_by_json:string;approvers_json:string}>();
  return {...(custody?{agentPreparer:JSON.parse(custody.prepared_by_json),approvers:JSON.parse(custody.approvers_json)}:{}),campaignAuthor:(author.results[0] as AttributedOperator|undefined)??null,
    revisionApprover:custody?null:(approver.results[0] as AttributedOperator|undefined)??null};
}
