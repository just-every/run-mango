import type {Platform} from '@/core/shared/platform';
import {activityStatement} from '@/core/features/auth/activity-record';
import {openSendingSecret,sealSendingSecret} from './secrets';
import {SendingConnectionError,sendgridAccount,sendingEvents,sendingScopes} from './sendgrid-account';

type Connection={generation:string;state:string;account_id:string;account_name:string;secret_cipher:string;last_four:string;
  broader:number;connected_by:string;connected_at:number;webhook_id:string|null;delivery_proved_at:number|null;last_error:string|null};
export function sendingConnectionService(platform:Platform) {
  const db=platform.database.$client,key=platform.config.sessionSigningKey;
  const origin=platform.config.publicBaseUrl.origin,url=new URL('/webhooks/mail/sendgrid',origin).href;
  const read=()=>db.prepare('SELECT * FROM sending_connection WHERE id=1').first<Connection>();
  const disclosure={provider:'SendGrid',webhookUrl:url,events:sendingEvents,signing:true,requiredScopes:sendingScopes};
  async function inspectCapacity(api:ReturnType<typeof sendgridAccount>,existing:Connection|null,accountId:string) {
    if(existing&&existing.account_id!==accountId&&existing.state!=='disconnected')throw new SendingConnectionError('Disconnect the existing SendGrid account before changing accounts.');
    const capacity=await api.capacity();
    const reusable=existing?.account_id===accountId&&existing.webhook_id&&capacity.webhooks.some(row=>row.id===existing.webhook_id);
    if(!reusable&&capacity.webhooks.filter(row=>row.enabled===true).length>=capacity.maxAllowed)throw new SendingConnectionError(`SendGrid has no free event webhook slot (limit ${capacity.maxAllowed}). Use the forwarding route in /docs/install before connecting.`);
    return reusable?existing!.webhook_id:null;
  }
  return {
    async status() {
      const row=await read();
      return {...disclosure,developerRoute:!row,connection:row?{provider:'SendGrid',state:row.state,account:row.account_name,lastFour:row.last_four,
        connectedBy:row.connected_by,connectedAt:row.connected_at,broader:row.broader===1,deliveryEventsVerified:Boolean(row.delivery_proved_at),error:row.last_error}:null};
    },
    async prepare(apiKey:string,operatorId:string) {
      const api=sendgridAccount(apiKey),account=await api.inspect();
      await inspectCapacity(api,await read(),account.accountId);
      const id=crypto.randomUUID(),now=Date.now();
      await db.batch([db.prepare('DELETE FROM sending_proposals WHERE expires_at<=? OR operator_id=?').bind(now,operatorId),
        db.prepare('INSERT INTO sending_proposals(id,operator_id,secret_cipher,account_id,account_name,broader,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)')
          .bind(id,operatorId,await sealSendingSecret({apiKey},key),account.accountId,account.accountName,account.broader?1:0,now,now+600000)]);
      return {...disclosure,proposalId:id,account:account.accountName,lastFour:apiKey.slice(-4),broader:account.broader};
    },
    async connect(proposalId:string,operator:{id:string;email:string}) {
      const proposal=await db.prepare('DELETE FROM sending_proposals WHERE id=? AND operator_id=? AND expires_at>? RETURNING *').bind(proposalId,operator.id,Date.now()).first<{secret_cipher:string;account_id:string;account_name:string;broader:number}>();
      if(!proposal)throw new SendingConnectionError('The connection review expired or was already used. Review the key again.');
      const secret=await openSendingSecret(proposal.secret_cipher,key),api=sendgridAccount(secret.apiKey),identity=await api.inspect();
      if(identity.accountId!==proposal.account_id)throw new SendingConnectionError('The SendGrid account changed. Review the key again.');
      const previous=await read(),reuse=await inspectCapacity(api,previous,identity.accountId),generation=crypto.randomUUID(),now=Date.now();
      const reserved=await db.prepare(`INSERT INTO sending_connection(id,generation,state,account_id,account_name,secret_cipher,last_four,broader,connected_by,connected_at,webhook_id)
        VALUES(1,?,'connecting',?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET generation=excluded.generation,state='connecting',account_id=excluded.account_id,
        account_name=excluded.account_name,secret_cipher=excluded.secret_cipher,last_four=excluded.last_four,broader=excluded.broader,connected_by=excluded.connected_by,
        connected_at=excluded.connected_at,webhook_id=excluded.webhook_id,delivery_proved_at=NULL,last_error=NULL WHERE sending_connection.state<>'connecting' RETURNING id`)
        .bind(generation,identity.accountId,identity.accountName,proposal.secret_cipher,secret.apiKey.slice(-4),identity.broader?1:0,operator.email,now,reuse).first();
      if(!reserved)throw new SendingConnectionError('Another connection is in progress. Complete or disconnect it first.');
      await activityStatement(db,{key:crypto.randomUUID(),action:'sending-connect-authorized',entityType:'integration',entityId:'sendgrid',actorId:operator.id,
        detail:{provider:'sendgrid',account:identity.accountName,lastFour:secret.apiKey.slice(-4),webhookUrl:url,events:sendingEvents,signing:true},at:now}).run();
      let webhookId=reuse,created=false;
      try {
        if(!webhookId) {
          const webhook=await api.request('/user/webhooks/event/settings','POST',{enabled:false,url,friendly_name:'Mango '+origin,
            ...Object.fromEntries(sendingEvents.map(event=>[event,true])),processed:false,open:false,click:false,group_resubscribe:false});
          if(typeof webhook?.id!=='string'||!webhook.id)throw new SendingConnectionError('SendGrid did not identify Mango’s created webhook.');
          webhookId=webhook.id as string;created=true;
          await db.prepare('UPDATE sending_connection SET webhook_id=? WHERE id=1 AND generation=?').bind(webhookId,generation).run();
        }
        const path='/user/webhooks/event/settings/'+encodeURIComponent(webhookId);
        const before=await api.request(path);
        if(before.id!==webhookId||before.url!==url||before.friendly_name!=='Mango '+origin)throw new SendingConnectionError('Mango’s stored webhook no longer has this installation’s address and name.');
        await api.request('/user/webhooks/event/settings/signed/'+encodeURIComponent(webhookId),'PATCH',{enabled:true});
        const signed=await api.request('/user/webhooks/event/settings/signed/'+encodeURIComponent(webhookId));
        if(signed.id!==webhookId||typeof signed.public_key!=='string'||!signed.public_key)throw new SendingConnectionError('SendGrid did not return Mango’s signing verification key.');
        // Validate the key before allowing the provider to post any events.
        let binary:Uint8Array<ArrayBuffer>;
        try {binary=Uint8Array.from(atob(signed.public_key),c=>c.charCodeAt(0));await crypto.subtle.importKey('spki',binary,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);}
        catch {throw new SendingConnectionError('SendGrid returned an invalid signing verification key.');}
        await api.request(path,'PATCH',{enabled:true,url,friendly_name:'Mango '+origin,...Object.fromEntries(sendingEvents.map(event=>[event,true]))});
        const checked=await api.request(path);
        if(checked.id!==webhookId||checked.enabled!==true||checked.url!==url||checked.public_key!==signed.public_key||sendingEvents.some(event=>checked[event]!==true))throw new SendingConnectionError('SendGrid did not confirm the signed event webhook configuration.');
        await db.batch([
          db.prepare("UPDATE sending_connection SET state='connected',secret_cipher=?,last_error=NULL WHERE id=1 AND generation=? AND state='connecting'")
            .bind(await sealSendingSecret({apiKey:secret.apiKey,publicKey:signed.public_key},key),generation),
          activityStatement(db,{key:`sending-connected:${generation}`,action:'sending-connected',entityType:'integration',entityId:'sendgrid',actorId:operator.id,
            detail:{provider:'sendgrid',account:identity.accountName,lastFour:secret.apiKey.slice(-4),webhookId},at:Date.now()}),
        ]);
        return {connected:true,deliveryEventsVerified:false};
      } catch(error) {
        let cause=error instanceof SendingConnectionError?error.message:'The SendGrid connection could not complete.';
        if(created&&webhookId) {
          try {await api.request('/user/webhooks/event/settings/'+encodeURIComponent(webhookId),'DELETE');webhookId=null;}
          catch {cause+=' Mango’s created webhook could not be deleted; disconnect it before trying again.';}
        }
        await db.prepare("UPDATE sending_connection SET state='failed',webhook_id=?,last_error=? WHERE id=1 AND generation=?").bind(webhookId,cause,generation).run();
        throw new SendingConnectionError(cause);
      }
    },
    async disconnect(operatorId:string) {
      const row=await read();if(!row)return {disconnected:true};
      if(row.state==='connecting')throw new SendingConnectionError('The connection is still in progress. Wait for its result before disconnecting.');
      if(row.webhook_id) {
        const secret=await openSendingSecret(row.secret_cipher,key);
        await sendgridAccount(secret.apiKey).request('/user/webhooks/event/settings/'+encodeURIComponent(row.webhook_id),'DELETE');
      }
      await db.batch([db.prepare("UPDATE sending_connection SET state='disconnected',generation=?,secret_cipher=?,webhook_id=NULL,delivery_proved_at=NULL,last_error=NULL WHERE id=1 AND generation=?")
        .bind(crypto.randomUUID(),await sealSendingSecret({apiKey:''},key),row.generation),
        activityStatement(db,{key:crypto.randomUUID(),action:'sending-disconnected',entityType:'integration',entityId:'sendgrid',actorId:operatorId})]);
      return {disconnected:true};
    },
  };
}
