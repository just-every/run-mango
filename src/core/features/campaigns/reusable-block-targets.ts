import {graphSchema} from '../flows/graph';
import type {Platform} from '@/core/shared/platform';
import {savedEmailSize} from './saved-email-size';
import {ReusableBlockError,type PlacementTarget} from './reusable-block-model';
import type {DraftComposition} from './draft-composition';
export type ReusableTarget={target:PlacementTarget;body:string;stamp:string|number;row:Record<string,any>;container?:any};
export async function readReusableTarget(platform:Platform,target:PlacementTarget):Promise<ReusableTarget>{
  const db=platform.database.$client;
  if(target.kind==='campaign'){
    const row=await db.prepare(`SELECT r.*,c.active_revision_id AS current_active_revision_id,(SELECT COUNT(*) FROM campaign_revisions d WHERE d.campaign_id=r.campaign_id AND d.state='draft') AS draft_count FROM campaign_revisions r JOIN campaigns c ON c.id=r.campaign_id WHERE r.id=?`).bind(target.id).first<Record<string,any>>();
    if(!row)throw new ReusableBlockError('This campaign revision is unavailable.');
    return {target,body:row.email_body,stamp:row.updated_at,row};
  }
  if(target.kind==='template'){
    const row=await db.prepare('SELECT * FROM campaign_templates WHERE id=?').bind(target.id).first<Record<string,any>>();
    if(!row)throw new ReusableBlockError('This saved template is unavailable.');
    const container=JSON.parse(row.composition_json);
    return {target,body:container.composition.emailBody??'',stamp:row.updated_at,row,container};
  }
  const row=await db.prepare('SELECT * FROM flow_draft_revisions WHERE id=?').bind(target.id).first<Record<string,any>>();
  if(!row)throw new ReusableBlockError('This flow draft is unavailable.');
  const container=JSON.parse(row.graph_json),node=container.nodes.find((node:any)=>node.id===target.nodeId&&node.kind==='email');
  if(!node?.email)throw new ReusableBlockError('Choose a saved draft email node.');
  return {target,body:node.email.html,stamp:row.graph_json,row,container};
}
export const targetSnapshot=(value:ReusableTarget)=>({kind:value.target.kind,id:value.target.id,stamp:value.stamp,state:value.row.state??'',active:value.row.current_active_revision_id??'',drafts:value.row.draft_count??0});
/** Checked once by the library CAS, before any dependent statement in its D1 batch. */
export const targetSnapshotGuard=`NOT EXISTS(SELECT 1 FROM json_each(?) p WHERE CASE json_extract(p.value,'$.kind')
 WHEN 'campaign' THEN NOT EXISTS(SELECT 1 FROM campaign_revisions r JOIN campaigns c ON c.id=r.campaign_id WHERE r.id=json_extract(p.value,'$.id') AND r.updated_at=json_extract(p.value,'$.stamp') AND r.state=json_extract(p.value,'$.state') AND COALESCE(c.active_revision_id,'')=json_extract(p.value,'$.active') AND (SELECT COUNT(*) FROM campaign_revisions d WHERE d.campaign_id=r.campaign_id AND d.state='draft')=json_extract(p.value,'$.drafts'))
 WHEN 'template' THEN NOT EXISTS(SELECT 1 FROM campaign_templates t WHERE t.id=json_extract(p.value,'$.id') AND t.updated_at=json_extract(p.value,'$.stamp'))
 WHEN 'flow' THEN NOT EXISTS(SELECT 1 FROM flow_draft_revisions f WHERE f.id=json_extract(p.value,'$.id') AND f.graph_json=json_extract(p.value,'$.stamp')) ELSE 1 END)`;
export async function checkReusableSize(platform:Platform,value:ReusableTarget,content:DraftComposition){
  const r=value.row,c=value.target.kind==='template'?value.container.composition:value.target.kind==='flow'?value.container.nodes.find((n:any)=>n.id===value.target.nodeId).email:null;
  await savedEmailSize(platform.database,{inclusionRuleJson:value.target.kind==='campaign'?r.inclusion_rule_json:undefined,exclusionRulesJson:value.target.kind==='campaign'?r.exclusion_rules_json:undefined,emailSubject:c?.emailSubject??c?.subject??r.email_subject??'',preheader:c?.preheader??r.preheader??'',physicalAddress:c?.physicalAddress??r.physical_address??platform.config.mailSender.physicalAddress,smsBody:c?.smsBody??r.sms_body??'',trackingEnabled:Boolean(c?.trackingEnabled??r.tracking_enabled),emailBody:content.emailBody!,emailText:content.emailText!},{publicBaseUrl:platform.config.publicBaseUrl.toString(),openTrackingEnabled:true});
}
export function targetWrites(platform:Platform,value:ReusableTarget,content:DraftComposition,guard:string,actor:string,now:number):D1PreparedStatement[]{
  const db=platform.database.$client,id=value.target.id;
  if(value.target.kind==='template'){
    const container={...value.container,composition:{...value.container.composition,...content}};
    return [db.prepare(`UPDATE campaign_templates SET composition_json=?,updated_by=?,updated_at=MAX(updated_at+1,?) WHERE id=? AND ${guard}`).bind(JSON.stringify(container),actor,now,id)];
  }
  if(value.target.kind==='flow'){
    const container=structuredClone(value.container),node=container.nodes.find((n:any)=>n.id===value.target.nodeId);
    node.email.html=content.emailBody;node.email.text=content.emailText;
    return [db.prepare(`UPDATE flow_draft_revisions SET graph_json=? WHERE id=? AND ${guard}`).bind(JSON.stringify(graphSchema.parse(container)),id)];
  }
  const writes=[db.prepare(`DELETE FROM campaign_checks WHERE revision_id=? AND ${guard}`).bind(id),
    db.prepare(`DELETE FROM campaign_audience_channel_counts WHERE audience_id IN(SELECT id FROM campaign_audiences WHERE revision_id=?) AND ${guard}`).bind(id),
    db.prepare(`DELETE FROM campaign_audiences WHERE revision_id=? AND ${guard}`).bind(id),
    db.prepare(`DELETE FROM campaign_revision_links WHERE revision_id=? AND ${guard}`).bind(id)];
  for(const [index,link] of (content.links??[]).entries())writes.push(db.prepare(`INSERT INTO campaign_revision_links(id,revision_id,sequence,label,destination_url,created_at,updated_at) SELECT ?,?,?,?,?,?,? WHERE ${guard}`).bind(crypto.randomUUID(),id,index+1,link.label,link.destinationUrl,now,now));
  writes.push(db.prepare(`UPDATE campaign_revisions SET email_body=?,email_text=?,content_digest=NULL,updated_at=MAX(updated_at+1,?) WHERE id=? AND state='draft' AND ${guard}`).bind(content.emailBody!,content.emailText!,now,id));
  return writes;
}
