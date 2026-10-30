import {sha256} from '@/core/shared/ids';
import {recordPortableHash} from '../portable-hashes';
import {recipientSuppressionSql} from '../public-resubscribe-policy';
import type {ErasureScope} from './types';

/** Retain each restriction's reason and occurrence time. Only a known unsubscribe
 * with no surviving reason gets the new, unambiguous erasure-unsubscribe marker.
 * Old erasure-opt-out markers still fail closed. */
export async function retainRestrictions(db:D1Database,salt:string,scope:ErasureScope,reference:string,now:number){
  const statements:D1PreparedStatement[]=[];
  for(const channel of scope.channels)for(const destination of channel==='email'?scope.emails:scope.phones){
    const hash=await sha256(`${salt}:${destination}`);
    const table=channel==='email'?'contact_email_addresses':'contact_phones';
    const column=channel==='email'?'email':'phone_e164';
    const status=channel==='email'?'email_status':'sms_status';
    const admitted='EXISTS(SELECT 1 FROM audience_erasures WHERE reference=?)';
    const suppressed=`EXISTS(SELECT 1 FROM ${table} WHERE ${column}=? AND channel_status='suppressed')
      OR EXISTS(SELECT 1 FROM contacts WHERE id IN (SELECT value FROM json_each(?)) AND ${status}='suppressed')`;
    statements.push(db.prepare(`INSERT INTO surviving_opt_outs(id,destination_hash,channel,reason,occurred_at,created_at,updated_at)
      SELECT lower(hex(randomblob(16))),destination_hash,channel,cause,occurred_at,created_at,updated_at FROM contact_suppressions
      WHERE destination_hash=? AND channel=? AND ${admitted}
      ON CONFLICT(destination_hash,channel,reason) DO NOTHING`).bind(hash,channel,reference));
    statements.push(db.prepare(`INSERT INTO surviving_opt_outs(id,destination_hash,channel,reason,occurred_at,created_at,updated_at)
      SELECT ?,?,?,CASE WHEN (${suppressed}) AND NOT EXISTS(SELECT 1 FROM contact_suppressions
        WHERE destination_hash=? AND channel=? AND ${recipientSuppressionSql}) THEN 'erasure-suppression' ELSE 'erasure-unsubscribe' END,?,?,?
      WHERE ${admitted} AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=? AND channel=?)`)
      .bind(crypto.randomUUID(),hash,channel,destination,JSON.stringify(scope.ids),hash,channel,now,now,now,reference,hash,channel));
    statements.push(recordPortableHash(db,hash,destination));
  }
  return statements;
}
