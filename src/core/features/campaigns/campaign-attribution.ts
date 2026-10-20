export type AttributedOperator = {operatorId:string;operatorName:string|null;occurredAt:number};
export type CampaignAttribution = {
  campaignAuthor:AttributedOperator|null;
  revisionApprover:AttributedOperator|null;
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
  return {campaignAuthor:(author.results[0] as AttributedOperator|undefined)??null,
    revisionApprover:(approver.results[0] as AttributedOperator|undefined)??null};
}
