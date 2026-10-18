import {contactLink} from '@/core/features/campaigns/contact-links';
import {textLinkDestinations} from '@/core/features/campaigns/message-links';
import {safeEmailUrl} from '@/core/features/campaigns/email-html-policy';
import type {Platform} from '@/core/shared/platform';
/** Delivery and operator previews use the same issued token format and URL rewrite. */
export async function renderTracking(platform:Platform,input:{channel:'email'|'sms';enabled:boolean;smsBody:string;links:Array<{destinationUrl:string}>;sendByAt:Date}){
 const trackedLinks:Array<{tokenDigest:string;destinationUrl:string;expiresAt:Date}>=[],rewritten=new Map<string,string>();
 if(input.enabled){
  const destinations=input.channel==='sms'?textLinkDestinations(input.smsBody):input.links.map(link=>link.destinationUrl);
  for(const destinationUrl of new Set(destinations)){
   if(contactLink(destinationUrl))continue;
   if(!safeEmailUrl(destinationUrl)||!platform.config.allowedLinkHosts.some(host=>new URL(destinationUrl).hostname===host||new URL(destinationUrl).hostname.endsWith(`.${host}`)))throw new Error('Tracked destination is outside the approved URL policy.');
   const expiresAt=new Date(input.sendByAt.getTime()+30*86400000),token=await platform.publicTokens.issue({id:crypto.randomUUID(),purpose:'link',expiresAt});
   trackedLinks.push({tokenDigest:await platform.publicTokens.digest(token),destinationUrl,expiresAt});
   rewritten.set(destinationUrl,`${platform.config.publicBaseUrl.toString().replace(/\/$/,'')}/l/${encodeURIComponent(token)}`);
  }
 }
 return {trackedLinks,rewritten};
}
