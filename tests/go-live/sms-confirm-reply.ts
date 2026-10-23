import {expect} from '@playwright/test';
import type {Installation} from './harness';
import type {providerEdge} from './edge';
/** The test receiver signs the same reply envelope as the provider boundary. */
export async function confirmSmsReply(site:Installation,edge:Awaited<ReturnType<typeof providerEdge>>,index=edge.sms.sends.length-1){
 const sent=edge.sms.sends[index],clock=await site.control('/_golive/clock');
 const payload={type:'inbound',to:sent.body.messages[0].sender,sender:sent.body.messages[0].to,message:'YES',received_at:new Date(clock.now).toISOString().slice(0,19).replace('T',' '),original_message_id:sent.messageId,original_custom_ref:sent.body.messages[0].custom_ref};
 const wrong=edge.sms.signed({...payload,original_message_id:'synthetic-mango-unknown-message'},clock.now);expect((await site.call('/webhooks/sms/mobile-message',{method:'POST',headers:wrong.headers,raw:wrong.body})).status).toBe(400);
 const signed=edge.sms.signed(payload,clock.now);
 const response=await site.call('/webhooks/sms/mobile-message',{method:'POST',headers:signed.headers,raw:signed.body});expect(response.status,await response.clone().text()).toBe(204);
 expect((await site.call('/webhooks/sms/mobile-message',{method:'POST',headers:signed.headers,raw:signed.body})).status).toBe(204);
}
