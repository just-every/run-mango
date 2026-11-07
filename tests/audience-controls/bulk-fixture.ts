import {expect} from '@playwright/test';
import {createApp} from '../../src/core/app/app';
import {native} from '../approval-binding/native';
import {testIdentity} from '../support/test-identity';

export const bulkPerson=(index:number)=>{
  const suffix=String(index).padStart(5,'0'),id=`synthetic-mango-bulk-${suffix}`;
  return {id,email:[id,'example.test'].join('@'),phone:`+120255${String(index+10000).padStart(5,'0')}`,
    name:`Market member ${suffix}${index===0?', Garden club':''}`};
};

/** Native D1 contacts, aliases and recorded permission: no provider or app replacement. */
export async function seedBulkPeople(db:D1Database,start:number,end:number) {
  const at=Date.now()-86400000;
  for(let offset=start;offset<end;offset+=25) {
    const statements:D1PreparedStatement[]=[];
    for(let index=offset;index<Math.min(end,offset+25);index++) {
      const person=bulkPerson(index),emailStatus=index===1?'pending':index===5?'unsubscribed':'subscribed';
      const smsStatus=index===2||index===5?'non-subscribed':'subscribed';
      statements.push(db.prepare(`INSERT INTO contacts(id,email,display_name,email_status,sms_status,email_status_at,sms_status_at,last_activity_at,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(person.id,person.email,person.name,emailStatus,smsStatus,at,at,at,at,at),
      db.prepare(`INSERT INTO contact_email_addresses(id,contact_id,email,channel_status,channel_status_at,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?)`).bind(`${person.id}-email`,person.id,person.email,emailStatus,at,at,at));
      if(index!==5)statements.push(db.prepare(`INSERT INTO contact_phones(id,contact_id,phone_e164,channel_status,channel_status_at,identity_status,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?)`).bind(`${person.id}-sms`,person.id,person.phone,smsStatus,at,index===3?'inactive':'active',at,at));
      // Only the six selection examples need consent; the large tag cohort does not send.
      if(index<6&&index!==2&&index!==5)for(const channel of ['email','sms'] as const) {
        const destination=channel==='email'?person.email:index===4?bulkPerson(49999).phone:person.phone;
        statements.push(db.prepare(`INSERT INTO consent_evidence
          (id,contact_id,channel,destination,brand_or_legal_sender,message_category,frequency_disclosure,destination_jurisdiction,capture_method,capture_source,consent_text,consent_version,occurred_at,confirmation_required,confirmed_at,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?)`)
          .bind(`${person.id}-${channel}-consent`,person.id,channel,destination,'Mango',index===4&&channel==='email'?'newsletter':'offers',
            'Weekly','US','recorded','Synthetic market signup','Send weekly market offers.','v1',at,index===3&&channel==='email'?null:at,at,at));
      }
      if(index===4)statements.push(db.prepare(`INSERT INTO consent_evidence
        (id,contact_id,channel,destination,brand_or_legal_sender,message_category,frequency_disclosure,destination_jurisdiction,capture_method,capture_source,consent_text,consent_version,occurred_at,confirmation_required,confirmed_at,created_at,updated_at)
        VALUES(?,?,'email',?,'Another sender','offers','Weekly','US','recorded','Synthetic other sender','Send other offers.','v1',?,1,?,?,?)`)
        .bind(`${person.id}-other-sender`,person.id,person.email,at,at,at,at));
    }
    await db.batch(statements);
  }
}

export async function bulkFixture() {
  const h=await native();
  try {
    const token='synthetic-mango-bulk-bootstrap-token-over-thirty-two-bytes';
    Object.assign(h.f.bindings,{AUTH_SETUP_TOKEN:token});h.f.platform.config.authSetupToken=token;
    let app=createApp(h.f.bindings,h.f.platform),cookie='';
    async function call(path:string,body?:unknown,method=body===undefined?'GET':'POST',as:string|null=cookie) {
      return app.fetch(new Request(`https://mango.example.test${path}`,{method,
        headers:{Host:'mango.example.test',Origin:'https://mango.example.test','CF-Connecting-IP':'192.0.2.32','Content-Type':'application/json',...(as?{Cookie:as}:{})},
        ...(body===undefined?{}:{body:JSON.stringify(body)})}),h.f.bindings);
    }
    async function json(path:string,body?:unknown,method?:string) {
      const response=await call(path,body,method),value=await response.json() as any;
      expect(response.status,JSON.stringify(value)).toBeLessThan(300);return value;
    }
    const bootstrap=await call('/auth/bootstrap',{token,displayName:'Bulk controls owner'});
    expect(bootstrap.status).toBe(303);cookie=bootstrap.headers.get('set-cookie')!.split(';')[0];
    const owner=(await json('/api/operator')).operator;
    async function session(operatorId:string) {
      const session=await testIdentity(h.f.platform).createTestSession(operatorId);
      return `__Host-operator_session=${session.token}`;
    }
    async function analyst() {
      const id='synthetic-mango-bulk-analyst';
      await testIdentity(h.f.platform).importLocalDemoOperator({id,email:[id,'example.test'].join('@'),displayName:'Market analyst'},new Date());
      await h.f.db.batch([
        h.f.db.prepare("UPDATE oa_operators SET role='member' WHERE id=?").bind(id),
        h.f.db.prepare('INSERT INTO operator_product_roles(operator_id,role,unmasked_contacts,updated_by,updated_at) VALUES(?,?,0,?,?)')
          .bind(id,'analyst',owner.id,Date.now()),
      ]);
      return session(id);
    }
    return {...h,call,json,analyst,
      restart(){app=createApp(h.f.bindings,h.f.originalProduction());},
      async renewOwner(){cookie=await session(owner.id);},
    };
  } catch(error) {await h.dispose();throw error;}
}
