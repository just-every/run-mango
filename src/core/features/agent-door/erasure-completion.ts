/** The only stale-generation writes an initiating erasure may finish are Base's
 * real SQL no-ops against its already tombstoned records. Each predicate below
 * is checked in the same native transaction; no table-wide custody exception.
 */
export type ErasureCompletion={reference:string;operationId:string;agentId:string;key:string|null};
export type CompletionStatement={sql:string;params:unknown[]};
export function completionGuard(rows:CompletionStatement[],own:ErasureCompletion){
 const guards:string[]=[],params:unknown[]=[];
 const audit=(id:unknown)=>{guards.push("EXISTS(SELECT 1 FROM agent_door_audit WHERE id=? AND agent=? AND json_extract(row,'$.tombstone.erasure_id')=?)");params.push(id,own.agentId,own.reference);};
 for(const row of rows){
  const {sql,params:values}=row;
  if(/^\s*(SELECT|PRAGMA|EXPLAIN)\b/i.test(sql))continue;
  if(sql.startsWith('INSERT INTO agent_door_audit(')&&sql.includes("WHERE json_extract(agent_door_audit.row,'$.tombstone') IS NULL")){
   let body;try{body=JSON.parse(String(values[4]));}catch{return null;}
   if(body.operation_id!==own.operationId||body.agent?.id!==own.agentId)return null;
   audit(values[0]);
  }else if(sql==='UPDATE agent_door_calls SET state=?,outcome=?,expires_at=coalesce(expires_at,?) WHERE agent=? AND key=?'){
   if(values[3]!==own.agentId||values[4]!==own.key)return null;
   guards.push('NOT EXISTS(SELECT 1 FROM agent_door_calls WHERE agent=? AND key=?)');params.push(own.agentId,own.key);
  }else if(sql==='DELETE FROM agent_door_calls WHERE agent=? AND key=? AND decision_id=?'){
   if(values[0]!==own.agentId||values[1]!==own.key)return null;
   audit(values[2]);guards.push('NOT EXISTS(SELECT 1 FROM agent_door_calls WHERE agent=? AND key=?)');params.push(own.agentId,own.key);
  }else if(sql==="UPDATE agent_door_approvals SET state=?,result=? WHERE id=? AND json_extract(saved,'$.tombstone') IS NULL"){
   guards.push("EXISTS(SELECT 1 FROM agent_door_approvals WHERE id=? AND json_extract(saved,'$.tombstone.erasure_id')=?)");params.push(values[2],own.reference);
  }else if(sql==="INSERT INTO agent_door_events(id,uri,event) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM agent_door_audit WHERE id=? AND json_extract(row,'$.tombstone') IS NOT NULL)"){
   audit(values[3]);
  }else if(sql==='UPDATE agent_door_state SET decision_lock=NULL,decision_until=NULL WHERE id=1 AND decision_lock=?'){
   audit(values[0]);
  }else return null;
 }
 if(!guards.length)return null;
 return {sql:"EXISTS(SELECT 1 FROM audience_erasures WHERE reference=? AND agent_operation_id=?) AND EXISTS(SELECT 1 FROM agent_door_audit WHERE id=? AND json_extract(row,'$.tombstone.erasure_id')=?) AND "+guards.join(' AND '),params:[own.reference,own.operationId,own.operationId,own.reference,...params]};
}
