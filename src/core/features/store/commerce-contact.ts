import {canonicalEmail,canonicalPhone} from '@/core/features/audience/identity';
import {portableHash,portableRestrictionStatements} from '@/core/features/audience/portable-hashes';
import {sha256,ulid} from '@/core/shared/ids';

type ContactInput={email?:string;phone?:string;displayName?:string};
const status=(hash:string,channel:string)=>`CASE WHEN EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=${hash} AND channel='${channel}') THEN 'suppressed' WHEN EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=${hash} AND channel='${channel}') THEN 'unsubscribed' ELSE 'non-subscribed' END`;
const statusAt=(hash:string,channel:string)=>`coalesce((SELECT max(occurred_at) FROM surviving_opt_outs WHERE destination_hash=${hash} AND channel='${channel}'),a.now)`;
const inputSql=`WITH a AS (SELECT json_extract(?1,'$.id') id,json_extract(?1,'$.email') email,json_extract(?1,'$.phone') phone,json_extract(?1,'$.name') name,json_extract(?1,'$.emailHash') emailHash,json_extract(?1,'$.phoneHash') phoneHash,json_extract(?1,'$.now') now)`;

/** Commerce-only read planning. Every mutation returned here is committed with
 * its source/receipt/money statements; native ownership guards reject races. */
export function commerceContactPlanner(db:D1Database,salt:string|undefined,now:Date){
  const planned=new Map<string,string>();
  return async(input:ContactInput)=>{
    if(!salt)throw new Error('Commerce identity import requires the contact hash salt.');
    const email=canonicalEmail(input.email),phone=canonicalPhone(input.phone);
    if(!email&&!phone)throw new Error('A contact requires an email address or E.164 phone number.');
    const emailOwner=email?await db.prepare('SELECT contact_id id FROM contact_email_addresses WHERE email=? UNION SELECT id FROM contacts WHERE email=?').bind(email,email).all<{id:string}>():null;
    const phoneOwner=phone?await db.prepare('SELECT contact_id id FROM contact_phones WHERE phone_e164=?').bind(phone).first<{id:string}>():null;
    const owners=new Set([...(emailOwner?.results.map(row=>row.id)??[]),phoneOwner?.id,email?planned.get(`email:${email}`):undefined,phone?planned.get(`phone:${phone}`):undefined].filter((id):id is string=>!!id));
    if(owners.size>1)throw new Error('The supplied email and phone already identify different contacts; merge them before linking identities.');
    const id=owners.values().next().value??ulid(now.getTime());
    const existed=(emailOwner?.results.length??0)>0||!!phoneOwner;
    if(email)planned.set(`email:${email}`,id);if(phone)planned.set(`phone:${phone}`,id);
    const emailHash=email?await sha256(`${salt}:${email}`):null,phoneHash=phone?await sha256(`${salt}:${phone}`):null;
    const data=JSON.stringify({id,email:email??null,phone:phone??null,name:input.displayName?.trim()||email||phone,emailHash,phoneHash,now:now.getTime()});
    const statements:D1PreparedStatement[]=[db.prepare(`INSERT INTO commerce_transaction_guard SELECT CASE WHEN
      NOT EXISTS(SELECT 1 FROM contacts WHERE merge_lock IS NOT NULL)
      AND (?=0 OR EXISTS(SELECT 1 FROM contacts WHERE id=?))
      AND NOT EXISTS(SELECT 1 FROM contact_email_addresses WHERE email=? AND contact_id<>?)
      AND NOT EXISTS(SELECT 1 FROM contacts WHERE email=? AND id<>?)
      AND NOT EXISTS(SELECT 1 FROM contact_phones WHERE phone_e164=? AND contact_id<>?) THEN 1 ELSE 0 END`).bind(existed?1:0,id,email??null,id,email??null,id,phone??null,id)];
    statements.push(...portableRestrictionStatements(db,[...(email?[{d:email,s:emailHash!,p:portableHash(email)}]:[]),...(phone?[{d:phone,s:phoneHash!,p:portableHash(phone)}]:[])]));
    statements.push(db.prepare(`${inputSql} INSERT INTO contacts(id,email,display_name,email_status,sms_status,email_status_at,sms_status_at,source_customer_record_id,last_activity_at,created_at,updated_at)
      SELECT a.id,a.email,a.name,${status('a.emailHash','email')},${status('a.phoneHash','sms')},${statusAt('a.emailHash','email')},${statusAt('a.phoneHash','sms')},NULL,NULL,a.now,a.now FROM a WHERE 1 ON CONFLICT(id) DO NOTHING`).bind(data));
    if(email)statements.push(db.prepare(`${inputSql} INSERT INTO contact_email_addresses(id,contact_id,email,channel_status,channel_status_at,created_at,updated_at)
      SELECT ?2,a.id,a.email,${status('a.emailHash','email')},${statusAt('a.emailHash','email')},a.now,a.now FROM a WHERE 1 ON CONFLICT DO NOTHING`).bind(data,ulid()));
    if(phone)statements.push(db.prepare(`${inputSql} INSERT INTO contact_phones(id,contact_id,phone_e164,channel_status,channel_status_at,identity_status,time_zone,location_source,location_recorded_at,created_at,updated_at)
      SELECT ?2,a.id,a.phone,${status('a.phoneHash','sms')},${statusAt('a.phoneHash','sms')},'active',NULL,NULL,NULL,a.now,a.now FROM a WHERE 1 ON CONFLICT DO NOTHING`).bind(data,ulid()));
    statements.push(db.prepare(`INSERT INTO commerce_transaction_guard SELECT CASE WHEN EXISTS(SELECT 1 FROM contacts WHERE id=? AND merge_lock IS NULL)
      AND (? IS NULL OR EXISTS(SELECT 1 FROM contact_email_addresses WHERE email=? AND contact_id=?))
      AND (? IS NULL OR EXISTS(SELECT 1 FROM contact_phones WHERE phone_e164=? AND contact_id=?)) THEN 1 ELSE 0 END`).bind(id,email??null,email??null,id,phone??null,phone??null,id));
    if(input.displayName?.trim())statements.push(db.prepare('UPDATE contacts SET display_name=?,updated_at=? WHERE id=?').bind(input.displayName.trim(),now.getTime(),id));
    return {id,statements};
  };
}
