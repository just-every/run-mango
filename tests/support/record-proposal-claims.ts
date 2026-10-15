/** Recorded evidence and canonical rationale for fixtures intended to be adoptable. */
export async function recordProposalClaims(db:D1Database,proposalId:string,now:number) {
  const claim='Observed evidence: "value".';
  const proposal=await db.prepare('SELECT exclusion_rules_json FROM proposals WHERE id=?').bind(proposalId).first<{exclusion_rules_json:string}>();
  const exclusions=JSON.parse(proposal!.exclusion_rules_json).map((rule:object)=>({...rule,reason:'Matches an exclusion condition'}));
  await db.batch([
    db.prepare('UPDATE proposals SET summary=?,decision_context_json=?,exclusion_rules_json=? WHERE id=?')
      .bind(claim,JSON.stringify({explanation:claim,timing:[claim]}),JSON.stringify(exclusions),proposalId),
    db.prepare(`INSERT INTO proposal_evidence_items (id,proposal_id,source_record_id,source_type,claim_key,observed_value_json,occurred_at,created_at)
      VALUES (?,?,'source-evidence','order','evidence','"value"',?,?)`).bind(`${proposalId}-evidence`,proposalId,now,now),
    db.prepare(`INSERT INTO proposal_steps (id,proposal_id,sequence,channel,scheduled_at,timezone,send_by_at,created_at,updated_at)
      VALUES (?,?,1,'email',?,'Etc/UTC',?,?,?)`).bind(`${proposalId}-step`,proposalId,now+3600000,now+7200000,now,now),
  ]);
}
