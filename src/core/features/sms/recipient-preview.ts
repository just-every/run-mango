import {analyticsContext} from '@/core/features/settings/analytics-policy';
import {ulid} from '@/core/shared/ids';
import type {Platform} from '@/core/shared/platform';
import {renderTracking} from '@/core/features/lifecycle/message-tracking';
import {renderMessageContent,type MessageRevision} from '@/core/features/campaigns/message-content';
import {confirmationUnsubscribePath} from '@/core/features/audience/unsubscribe-paths';
import {managedSmsText} from './content';
import type {SmsProgramme} from './policy';
import {smsSegments} from './segments';
/** The delivery rendering pipeline with real opaque URL formats. Tokens are not
 * registered as active public links, so previews never create unsubscribe authority. */
export async function renderSmsRecipientPreview(platform:Platform,input:{revision:MessageRevision&{trackingEnabled:boolean};links:Array<{destinationUrl:string}>;values:Record<string,string|null|undefined>;sendByAt:Date;policy:SmsProgramme;sender:string},now=new Date()){
 const {rewritten}=await renderTracking(platform,{analytics:analyticsContext(input.revision),channel:'sms',enabled:input.revision.trackingEnabled,smsBody:input.revision.smsBody,links:input.links,sendByAt:input.sendByAt});
 const token=await platform.publicTokens.issue({id:ulid(now.getTime()),purpose:'unsubscribe',expiresAt:new Date(now.getTime()+365*86400000)});
 const rendered=renderMessageContent(input.revision,{analytics:analyticsContext(input.revision),values:input.values,unsubscribeUrl:`${platform.config.publicBaseUrl.toString().replace(/\/$/,'')}${confirmationUnsubscribePath(token)}`,rewrittenLinks:rewritten});
 const text=managedSmsText(rendered.sms,input.policy,input.sender);
 return {text,...smsSegments(text)};
}
