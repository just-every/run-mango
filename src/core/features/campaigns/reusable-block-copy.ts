import type {Platform} from '@/core/shared/platform';
import type {DraftComposition} from './draft-composition';
import type {ReusableTarget} from './reusable-block-targets';
/** A new editable revision. The approved row, active revision and dispatch authority are untouched. */
export async function copyReusableRevision(platform:Platform,value:ReusableTarget,content:DraftComposition,blockId:string,blockJson:string,guard:string,actor:string,now:number){
  const db=platform.database.$client,id=crypto.randomUUID(),source=value.target.id;
  const columns=(await db.prepare('PRAGMA table_info(campaign_revisions)').all<{name:string}>()).results.map(row=>row.name);
  const values:unknown[]=[],overrides:Record<string,unknown>={id,state:'draft',email_body:content.emailBody,email_text:content.emailText,content_digest:null,approved_at:null,approved_by_operator_id:null,created_at:now,updated_at:now};
  const select=columns.map(column=>{
    if(column==='version')return '(SELECT COALESCE(MAX(version),0)+1 FROM campaign_revisions WHERE campaign_id=r.campaign_id)';
    if(Object.hasOwn(overrides,column)){values.push(overrides[column]);return '?';}
    return 'r."'+column+'"';
  });
  const writes=[db.prepare(`INSERT INTO campaign_revisions(${columns.map(c=>'"'+c+'"').join(',')}) SELECT ${select.join(',')} FROM campaign_revisions r WHERE r.id=? AND r.state='approved' AND ${guard}`).bind(...values,source)];
  writes.push(db.prepare(`INSERT INTO campaign_steps(id,revision_id,sequence,channel,timezone,scheduled_at,send_by_at,why_this_time,timing_origin,created_at,updated_at) SELECT ?||id,?,sequence,channel,timezone,scheduled_at,send_by_at,why_this_time,timing_origin,?,? FROM campaign_steps WHERE revision_id=? AND ${guard}`).bind(id+':',id,now,now,source));
  for(const [index,link] of (content.links??[]).entries())writes.push(db.prepare(`INSERT INTO campaign_revision_links(id,revision_id,sequence,label,destination_url,created_at,updated_at) SELECT ?,?,?,?,?,?,? WHERE ${guard}`).bind(crypto.randomUUID(),id,index+1,link.label,link.destinationUrl,now,now));
  writes.push(db.prepare(`INSERT INTO reusable_email_block_placements(id,block_id,target_kind,target_id,node_id,position,block_json) SELECT ?||id,block_id,'campaign',?,'',position,CASE WHEN block_id=? THEN ? ELSE block_json END FROM reusable_email_block_placements WHERE target_kind='campaign' AND target_id=? AND ${guard}`).bind(id+':',id,blockId,blockJson,source));
  writes.push(db.prepare(`UPDATE reusable_email_block_placements SET replacement_revision_id=? WHERE block_id=? AND target_kind='campaign' AND target_id=? AND ${guard}`).bind(id,blockId,source));
  writes.push(db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at) SELECT ?,?,'campaign-revision',?,'reusable-block.draft-created','operator',?,?,?,? WHERE ${guard}`).bind(crypto.randomUUID(),crypto.randomUUID(),id,actor,JSON.stringify({sourceRevisionId:source,campaignId:value.row.campaign_id}),now,now));
  return {id,campaignId:value.row.campaign_id as string,writes};
}
