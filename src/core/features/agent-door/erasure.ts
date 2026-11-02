import {agentErasureStatements, type AgentArtifactMap} from '@/vendor/base/agent-door/index.ts';
import {hasLiteral} from '../audience/erasure/literals';
import {identifierNeedles} from '../audience/erasure/needles';
import type {ErasureScope} from '../audience/erasure/types';

// Dynamic predicates are re-evaluated by Base's atomic selection assertion.
// The second binding also covers Mango's encoded-identifier discovery; unlike
// a row-id-only selection, new raw captures cannot slip between read and commit.
const mentions=(table:string,columns:string[])=>"EXISTS(SELECT 1 FROM json_each(?1) n WHERE "+columns.map(column=>`instr(lower(CAST(${table}.${column} AS TEXT)),lower(n.value))>0`).join(' OR ')+')';
const payloads={calls:['key','outcome'],audit:['row','evidence'],approvals:['saved','approvals','result'],reviews:['saved','marked_by'],events:['uri','event'],usage:['classes']};
const decisions="SELECT id FROM agent_door_audit WHERE "+mentions('agent_door_audit',payloads.audit);
const selected = (key: keyof typeof payloads) => {
 const reference=key==='calls'||key==='usage'?'decision_id':key==='audit'?'id':key==='events'?"json_extract(event,'$.decision_id')":"json_extract(saved,'$.decision_id')";
 return {sql:`rowid IN (SELECT value FROM json_each(?2)) OR ${mentions('agent_door_'+key,payloads[key])} OR ${reference} IN (${decisions}) OR ${reference}=?3`+
  (key==='audit'?` OR json_extract(row,'$.decision_id') IN (${decisions}) OR json_extract(row,'$.operation_id') IN (${decisions}) OR json_extract(row,'$.replay_of') IN (${decisions})`:''),params:['identifiers',key,'operation']};
};
/** Contacts are customers, independently of native operator and Business people.
 * Retain Base's value-free outcome/role/time tombstones; clear personal payload,
 * confirming digests and keys. The replay alias is the sole private exception.
 * Business-held projections are external custody: tombstone pulls and the relay's
 * authority/stop/unreachable rules purge their former personal projections.
 */
export const contactAgentArtifacts: AgentArtifactMap = {artifacts:[
 {table:'agent_door_state',columns:['id','envelope','local_document','local_revision','local_paused','decision_lock','decision_until'],unrelated:'Installation policy and admission leases, not customer principals.'},
 {table:'agent_door_agents',columns:['id','name','specialist','sponsor','sponsor_name','revoked','window','requests','tombstone'],unrelated:'Non-person agents and independently serving native operator sponsors; contacts are not operators.'},
 {table:'agent_door_calls',columns:['agent','key','digest','decision_id','created_at','state','outcome','expires_at'],match:selected('calls')},
 {table:'agent_door_audit',columns:['sequence','id','at','agent','classes','row','evidence'],match:selected('audit')},
 {table:'agent_door_approvals',columns:['id','state','saved','approvals','result','version'],match:selected('approvals')},
 {table:'agent_door_reviews',columns:['id','state','saved','marked_by','marked_at'],match:selected('reviews')},
 {table:'agent_door_events',columns:['sequence','id','uri','event'],match:selected('events')},
 {table:'agent_door_usage',columns:['decision_id','at','seed','specialist','agent','classes'],match:selected('usage')},
 {table:'agent_door_replay_aliases',columns:['agent','alias','call_id','tombstone'],unrelated:'Installation-private HMAC associations to value-free tombstones, bounded by the original call expiry; never exported or restored.'},
 {table:'agent_door_relay',columns:['sequence','decision_id','business'],unrelated:'Value-free decision ids and installation Business id; projections use the erasure-aware audit. Never exported or restored.'},
]};

/** Resolve native children before deletion. Never select a peer by a name or IP.
 * Reuse Mango's identifier/encoding matcher, including imported source identities.
 * Base then asserts both the exact selection and every cell in the same batch.
 */
export async function eraseContactAgentArtifacts(db:D1Database,secret:string,scope:ErasureScope,
 tombstone:{erasure_id:string;at:string},checkpoint:()=>Promise<D1PreparedStatement[]>,operationId:string|null=null) {
 // Native source and child ids can be the only target of a queued operation.
 const children:string[]=[];
 for(const table of ['source_records','source_activities','consent_evidence','consent_capture_metadata','recipient_steps','sms_service_messages']){
  const linked=(await db.prepare(`SELECT id FROM ${table} WHERE contact_id IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(scope.ids)).all<{id:string}>()).results;
  children.push(...linked.map(row=>row.id));
 }
 const identifiers=[...new Set([...scope.identifiers,...children])];
 const needles=identifierNeedles({...scope,identifiers});
 const rows=new Map<string,Record<string,unknown>[]>();
 for(const artifact of contactAgentArtifacts.artifacts.filter(item=>item.match)){
  const tableRows:Record<string,unknown>[]=[];
  let cursor=0;
  while(true){
   const page=(await db.prepare(`SELECT rowid AS _rowid,* FROM ${artifact.table} WHERE rowid>? ORDER BY rowid LIMIT 100`).bind(cursor).all<Record<string,unknown>>()).results;
   if(!page.length)break;
   tableRows.push(...page);cursor=Number(page.at(-1)!._rowid);
  }
  rows.set(artifact.table,tableRows);
 }
 // Link results, reviews, continuations and replays to their originating decision.
 const ids=new Set<string>(),picked=new Map<string,Set<number>>();
 const references=(row:Record<string,unknown>)=>{
  const refs=[row.decision_id];
  for(const column of ['row','saved','event']){
   if(typeof row[column]!=='string')continue;
   const value=JSON.parse(row[column] as string);
   refs.push(value.id,value.decision_id,value.operation_id,value.operationId,value.replay_of,value.data?.decision_id);
  }
  return refs.filter((value):value is string=>typeof value==='string'&&value.length>0);
 };
 let changed=true;
 while(changed){
  changed=false;
  for(const [table,items] of rows){
   const matches=picked.get(table)??new Set<number>();picked.set(table,matches);
   for(const row of items){
    if(matches.has(Number(row._rowid)))continue;
    const refs=references(row);
    if(!hasLiteral(row,needles)&&!refs.some(id=>ids.has(id)||id===operationId))continue;
    matches.add(Number(row._rowid));changed=true;
    for(const id of refs)ids.add(id);
    if(table==='agent_door_audit')ids.add(String(row.id));
   }
  }
 }
 const subject=Object.fromEntries(contactAgentArtifacts.artifacts.filter(item=>item.match).map(item=>[
  item.match!.params[1],JSON.stringify([...picked.get(item.table)??[]]),
 ]));
 return agentErasureStatements({db,secret,map:contactAgentArtifacts,subject:{...subject,identifiers:JSON.stringify(identifiers),operation:operationId},tombstone,checkpoint});
}
