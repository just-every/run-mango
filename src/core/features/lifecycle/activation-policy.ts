import {hasPermission, type ProductRole} from '@/core/features/auth/permissions';
import {IntegrationError} from '@/core/features/integrations/schema';

export type ActivationPolicy = {approverOperatorId:string; approverName:string; generation:number; updatedAt:number};
export async function activationPolicy(db:D1Database) {
  return db.prepare(`SELECT p.approver_operator_id approverOperatorId,COALESCE(o.display_name,'Unavailable operator') approverName,p.generation,p.updated_at updatedAt
    FROM campaign_activation_policy p LEFT JOIN operators o ON o.id=p.approver_operator_id WHERE p.id=1`).first<ActivationPolicy>();
}

/** Company policy is consulted by native signoff and machine scheduling at the same boundary. */
export async function activationAuthority(db:D1Database,input:{operatorId:string;revisionId:string;updatedAt:number;holdId?:string}) {
  const policy=await activationPolicy(db);
  if(policy && policy.approverOperatorId!==input.operatorId)return {ok:false as const,detail:'Company policy requires approval by the named person.'};
  if(input.holdId) {
    const held=await db.prepare(`SELECT h.id FROM campaign_activation_holds h JOIN integration_credentials k ON k.id=h.credential_id
      WHERE h.id=? AND h.revision_id=? AND h.revision_updated_at=? AND h.policy_generation=?
        AND h.approver_operator_id=? AND k.revoked_at IS NULL`).bind(input.holdId,input.revisionId,input.updatedAt,policy?.generation??0,input.operatorId).first();
    if(!held)return {ok:false as const,detail:'The held request is stale or its credential was revoked. Review the saved revision again.'};
  }
  return {ok:true as const,generation:policy?.generation??0};
}

export async function holdActivation(db:D1Database,credentialId:string,campaignId:string,revisionId:string) {
  const policy=await activationPolicy(db);
  if(!policy)return undefined;
  const revision=await db.prepare(`SELECT r.updated_at updatedAt,r.state,r.approved_by_operator_id approver,r.approved_at approvedAt
    FROM campaign_revisions r JOIN campaigns c ON c.id=r.campaign_id WHERE r.id=? AND c.id=? AND c.active_revision_id=r.id
      AND c.state IN ('draft','scheduled','dispatching')`).bind(revisionId,campaignId).first<{updatedAt:number;state:string;approver:string|null;approvedAt:number|null}>();
  if(!revision)throw new IntegrationError('owner_approved_revision_required',409);
  if(revision.state==='approved' && revision.approver===policy.approverOperatorId && (revision.approvedAt??0)>=policy.updatedAt)return undefined;
  if(revision.state!=='draft')throw new IntegrationError('company_policy_requires_new_revision',409);
  const id=crypto.randomUUID(),now=Date.now();
  // Both classes are derived here. A caller cannot downgrade provider spend.
  await db.prepare(`INSERT INTO campaign_activation_holds(id,campaign_id,revision_id,revision_updated_at,policy_generation,approver_operator_id,credential_id,risk_classes_json,created_at)
    SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM integration_credentials WHERE id=? AND revoked_at IS NULL)
      AND EXISTS(SELECT 1 FROM campaign_activation_policy WHERE id=1 AND generation=?)
      AND EXISTS(SELECT 1 FROM campaign_revisions WHERE id=? AND state='draft' AND updated_at=?) ON CONFLICT DO NOTHING`)
    .bind(id,campaignId,revisionId,revision.updatedAt,policy.generation,policy.approverOperatorId,credentialId,JSON.stringify(['external','money']),now,
      credentialId,policy.generation,revisionId,revision.updatedAt).run();
  const hold=await db.prepare(`SELECT id,revision_id revisionId,revision_updated_at revisionUpdatedAt,approver_operator_id approverOperatorId,
    risk_classes_json riskClassesJson FROM campaign_activation_holds WHERE revision_id=? AND revision_updated_at=? AND policy_generation=? AND credential_id=?`)
    .bind(revisionId,revision.updatedAt,policy.generation,credentialId).first<{id:string;revisionId:string;revisionUpdatedAt:number;approverOperatorId:string;riskClassesJson:string}>();
  if(!hold)throw new IntegrationError('activation_changed',409);
  return {status:'held' as const,holdId:hold.id,revisionId:hold.revisionId,revisionUpdatedAt:hold.revisionUpdatedAt,approverOperatorId:hold.approverOperatorId,riskClasses:JSON.parse(hold.riskClassesJson)};
}

export async function saveActivationPolicy(db:D1Database,approver:string,actor:string) {
  const operator=await db.prepare(`SELECT COALESCE(r.role,'owner') role FROM operators o JOIN oa_operators a ON a.id=o.id
    LEFT JOIN operator_product_roles r ON r.operator_id=o.id WHERE o.id=? AND o.removed_at IS NULL AND a.status='active'`).bind(approver).first<{role:ProductRole}>();
  if(!operator || !hasPermission(operator.role,'campaign.approve'))return false;
  const now=Date.now(),id=crypto.randomUUID();
  await db.batch([
    db.prepare(`INSERT INTO campaign_activation_policy(id,approver_operator_id,generation,updated_by,updated_at) VALUES(1,?,1,?,?)
      ON CONFLICT(id) DO UPDATE SET approver_operator_id=excluded.approver_operator_id,generation=generation+1,updated_by=excluded.updated_by,updated_at=MAX(campaign_activation_policy.updated_at+1,excluded.updated_at)`).bind(approver,actor,now),
    db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
      VALUES(?,?,'company-policy','campaign-activation','campaign.activation-policy-changed','operator',?,?,?,?)`).bind(id,id,actor,JSON.stringify({approverOperatorId:approver}),now,now),
  ]);
  return true;
}

export async function currentActivationHold(db:D1Database,revisionId:string,updatedAt:number) {
  return db.prepare(`SELECT h.id holdId,k.name requesterName,h.risk_classes_json riskClassesJson,h.created_at createdAt
    FROM campaign_activation_holds h JOIN integration_credentials k ON k.id=h.credential_id
    JOIN campaign_activation_policy p ON p.id=1 AND p.generation=h.policy_generation
    WHERE h.revision_id=? AND h.revision_updated_at=? AND k.revoked_at IS NULL ORDER BY h.created_at DESC,h.id LIMIT 1`)
    .bind(revisionId,updatedAt).first<{holdId:string;requesterName:string;riskClassesJson:string;createdAt:number}>();
}
