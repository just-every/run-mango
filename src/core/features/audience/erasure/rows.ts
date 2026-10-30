import type {D1Sql} from '@/vendor/base/import-kit/src/d1/index';
import type {ErasureTable} from './declaration';
import type {ErasureRow,ErasureScope} from './types';
import {redactLiteral} from './literals';
import {scopedNeedles} from './needles';
export const quote=(name:string)=>`"${name.replaceAll('"','""')}"`;
/** What erasure does to one selected row. `direct` rows are reached through the
 * table's contact scope; any other selected row only names the contact by an
 * exact identifier, so it belongs to someone else (or no one) and is redacted,
 * never deleted or reassigned. */
export function rowChanges(table:ErasureTable,row:ErasureRow,scope:ErasureScope,reference:string,direct:boolean):'delete'|Record<string,unknown>{
  if(table.mode==='invalidate-campaign')return {state:'erasure-invalidated'};
  if(table.mode==='invalidate-recipient')return {transport_disposition:'skipped',skip_reason:'erasure-review-required',terminal_at:Date.now()};
  if(direct&&(!table.mode||table.mode==='contact-data'))return 'delete';
  const changes:Record<string,unknown>={},needles=scopedNeedles(scope);
  for(const [column,value]of Object.entries(row))if(column!=='_cursor' && typeof value==='string'){const next=redactLiteral(value,needles);if(next!==value)changes[column]=next;}
  if(direct&&table.mode==='suppression')Object.assign(changes,{contact_id:null,provider_event_id:String(row.provider_event_id??'').startsWith('integration:')?`integration:erased:${crypto.randomUUID()}`:null});
  if(direct&&table.mode==='audit'){
    changes.detail_json='{}';if(scope.ids.includes(String(row.entity_id)))changes.entity_id=reference;
    if(scope.ids.includes(String(row.actor_id)))changes.actor_id=reference;
    changes.operation_key=`erased-audit:${crypto.randomUUID()}`;
  }
  if(direct&&table.mode==='recipient')Object.assign(changes,{contact_id:reference,contact_identity_key:reference,destination:'',provider_message_id:null,outbound_request_json:null,last_error_detail:null,reconcile_cursor:null,idempotency_key:`erased:${crypto.randomUUID()}`,lease_token:null,lease_expires_at:null,...(['queued','handoff-unknown'].includes(String(row.transport_disposition))?{transport_disposition:'skipped',skip_reason:'contact-erased',terminal_at:Date.now()}:{} )});
  if(Object.keys(changes).length&&table.table==='campaign_revisions')Object.assign(changes,{state:'erasure-invalidated'});
  if(Object.keys(changes).length&&table.table==='proposals')Object.assign(changes,{state:'draft'});
  return changes;
}
export function eraseRow(table:ErasureTable,row:ErasureRow,scope:ErasureScope,reference:string,direct:boolean):D1Sql[]{
  const changes=rowChanges(table,row,scope,reference,direct);
  if(changes==='delete')return [{sql:`DELETE FROM ${quote(table.table)} WHERE rowid=?`,params:[row._cursor]}];
  const entries=Object.entries(changes);
  return entries.length?[{sql:`UPDATE ${quote(table.table)} SET ${entries.map(([column])=>`${quote(column)}=?`).join(',')} WHERE rowid=?`,params:[...entries.map(([,value])=>value),row._cursor]}]:[];
}
