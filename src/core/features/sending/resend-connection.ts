import type {Platform} from '@/core/shared/platform';
import {activityStatement} from '../auth/activity-record';
import {openSendingSecret,sealSendingSecret} from './secrets';
import {SendingConnectionError} from './sendgrid-account';
import {resendAccount,resendEvents,ResendConnectionError} from './resend-account';
export function resendConnectionService(platform:Platform){
  const db=platform.database.$client,key=platform.config.sessionSigningKey,origin=platform.config.publicBaseUrl.origin;
  const url=new URL('/webhooks/mail/resend',origin).href;
  const disclosure={provider:'Resend',webhookUrl:url,events:resendEvents,signing:true,requiredScopes:['Full access API key: webhook management']};
  const read=()=>db.prepare('SELECT * FROM sending_connection WHERE id=1').first<{state:string;account_id:string;webhook_id:string|null;secret_cipher:string;generation:string}>();
  return {
    async prepare(apiKey:string,operatorId:string){
      const previous=await read();if(previous&&previous.account_id!=='resend'&&previous.state!=='disconnected')throw new SendingConnectionError('Disconnect the existing provider before changing providers.');
      const hooks=await resendAccount(apiKey).inspect();if(hooks.some(hook=>hook.endpoint===url&&hook.id!==previous?.webhook_id))throw new SendingConnectionError('A webhook already uses this installation’s address without Mango’s saved ownership. Review it in Resend before connecting.');const id=crypto.randomUUID(),now=Date.now();
      await db.batch([db.prepare('DELETE FROM sending_proposals WHERE expires_at<=? OR operator_id=?').bind(now,operatorId),db.prepare('INSERT INTO sending_proposals(id,operator_id,secret_cipher,account_id,account_name,broader,created_at,expires_at) VALUES(?,?,?,?,?,1,?,?)').bind(id,operatorId,await sealSendingSecret({apiKey,provider:'resend'},key),'resend','Account identity not verified',now,now+600000)]);
      return {...disclosure,proposalId:id,account:'Account identity not verified',lastFour:apiKey.slice(-4),broader:true};
    },
    async connect(proposalId:string,operator:{id:string;email:string}){
      const proposal=await db.prepare('DELETE FROM sending_proposals WHERE id=? AND operator_id=? AND expires_at>? RETURNING secret_cipher').bind(proposalId,operator.id,Date.now()).first<{secret_cipher:string}>();
      if(!proposal)throw new SendingConnectionError('The connection review expired or was already used. Review the key again.');
      const secret=await openSendingSecret(proposal.secret_cipher,key);if(secret.provider!=='resend')throw new SendingConnectionError('Review the Resend key again.');
      const api=resendAccount(secret.apiKey),hooks=await api.inspect(),previous=await read();
      if(previous&&previous.account_id!=='resend'&&previous.state!=='disconnected')throw new SendingConnectionError('Disconnect the existing provider before changing providers.');
      let webhookId=previous?.account_id==='resend'?previous.webhook_id:null;
      let webhookSecret=previous?.account_id==='resend'?(await openSendingSecret(previous.secret_cipher,key)).publicKey:undefined;
      if(webhookId&&!hooks.some(hook=>hook.id===webhookId))throw new SendingConnectionError('Mango’s saved webhook is missing. Disconnect before creating a replacement.');
      const generation=crypto.randomUUID(),now=Date.now(),reservedCipher=await sealSendingSecret({...secret,...(webhookSecret?{publicKey:webhookSecret}:{})},key);
      const reserved=await db.prepare(`INSERT INTO sending_connection(id,generation,state,account_id,account_name,secret_cipher,last_four,broader,connected_by,connected_at,webhook_id) VALUES(1,?,'connecting','resend','Account identity not verified',?,?,1,?,?,?) ON CONFLICT(id) DO UPDATE SET generation=excluded.generation,state='connecting',account_id='resend',account_name='Account identity not verified',secret_cipher=excluded.secret_cipher,last_four=excluded.last_four,broader=1,connected_by=excluded.connected_by,connected_at=excluded.connected_at,webhook_id=excluded.webhook_id,delivery_proved_at=NULL,last_error=NULL WHERE sending_connection.state<>'connecting' RETURNING id`).bind(generation,reservedCipher,secret.apiKey.slice(-4),operator.email,now,webhookId).first();
      if(!reserved)throw new SendingConnectionError('Another connection is in progress.');
      let created=false;
      try{
        await activityStatement(db,{key:crypto.randomUUID(),action:'sending-connect-authorized',entityType:'integration',entityId:'resend',actorId:operator.id,detail:{provider:'resend',webhookUrl:url,events:resendEvents,signing:true},at:now}).run();
        if(!webhookId){const hook=await api.request('/webhooks','POST',{endpoint:url,events:resendEvents});
          if(typeof hook.id!=='string'||!hook.id)throw new SendingConnectionError('Resend did not identify Mango’s webhook.');
          webhookId=hook.id;created=true;webhookSecret=hook.signing_secret;
          await db.prepare('UPDATE sending_connection SET webhook_id=? WHERE id=1 AND generation=?').bind(webhookId,generation).run();
        }
        if(typeof webhookSecret!=='string'||!webhookSecret.startsWith('whsec_'))throw new SendingConnectionError('Resend did not return a webhook signing secret.');
        try{if(atob(webhookSecret.slice(6)).length<16)throw new Error();}catch{throw new SendingConnectionError('Resend returned an invalid signing secret.');}
        const checked=await api.request('/webhooks/'+encodeURIComponent(webhookId!));
        if(checked.id!==webhookId||checked.endpoint!==url||checked.status!=='enabled'||!Array.isArray(checked.events)||resendEvents.some(event=>!checked.events.includes(event)))throw new SendingConnectionError('Resend did not confirm Mango’s signed event webhook configuration.');
        await db.batch([db.prepare("UPDATE sending_connection SET state='connected',secret_cipher=?,last_error=NULL WHERE id=1 AND generation=? AND state='connecting'").bind(await sealSendingSecret({...secret,publicKey:webhookSecret},key),generation),activityStatement(db,{key:`sending-connected:${generation}`,action:'sending-connected',entityType:'integration',entityId:'resend',actorId:operator.id,detail:{provider:'resend',webhookId},at:Date.now()})]);
        return {connected:true,deliveryEventsVerified:false};
      }catch(error){
        let cause=error instanceof SendingConnectionError?error.message:'The Resend connection could not complete.';
        if(created&&webhookId)try{await api.request('/webhooks/'+encodeURIComponent(webhookId),'DELETE');webhookId=null;}catch{cause+=' Mango’s created webhook could not be deleted; disconnect before retrying.';}
        await db.prepare("UPDATE sending_connection SET state='failed',webhook_id=?,last_error=? WHERE id=1 AND generation=?").bind(webhookId,cause,generation).run();throw new SendingConnectionError(cause);
      }
    },
    async disconnect(operatorId:string){const row=await read();if(!row)return {disconnected:true};if(row.state==='connecting')throw new SendingConnectionError('Wait for the connection to finish before disconnecting.');
      if(row.webhook_id){const secret=await openSendingSecret(row.secret_cipher,key);try{await resendAccount(secret.apiKey).request('/webhooks/'+encodeURIComponent(row.webhook_id),'DELETE');}catch(error){if(!(error instanceof ResendConnectionError&&error.status===404))throw error;}}
      await db.batch([db.prepare("UPDATE sending_connection SET state='disconnected',generation=?,secret_cipher=?,webhook_id=NULL,delivery_proved_at=NULL,last_error=NULL WHERE id=1 AND generation=?").bind(crypto.randomUUID(),await sealSendingSecret({apiKey:'',provider:'resend'},key),row.generation),activityStatement(db,{key:crypto.randomUUID(),action:'sending-disconnected',entityType:'integration',entityId:'resend',actorId:operatorId})]);return {disconnected:true};},
  };
}
