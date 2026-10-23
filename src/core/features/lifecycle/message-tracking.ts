import {analyticsUrl,type AnalyticsContext} from '@/core/features/settings/analytics-policy';
import {trackingDomainStatus} from '@/core/features/sender-verification/tracking-domain';
import {contactLink} from '@/core/features/campaigns/contact-links';
import {textLinkDestinations} from '@/core/features/campaigns/message-links';
import {safeEmailUrl} from '@/core/features/campaigns/email-html-policy';
import {allowedLinkHost} from '@/core/features/settings/link-hosts-validation';
import type {Platform} from '@/core/shared/platform';
/** Delivery and operator previews use the same issued token format and URL rewrite. */
export async function renderTracking(platform:Platform,input:{channel:'email'|'sms';analytics?:AnalyticsContext;enabled:boolean;smsBody:string;links:Array<{destinationUrl:string}>;sendByAt:Date}){
 const trackedLinks:Array<{tokenDigest:string;destinationUrl:string;originalDestinationUrl:string;expiresAt:Date}>=[],rewritten=new Map<string,string>();
 {
  const tracking = input.enabled?await trackingDomainStatus(platform):undefined;
  const origin = tracking?.passed ? 'https://' + tracking.host : platform.config.publicBaseUrl.toString().replace(/\/$/, '');
  const destinations=input.channel==='sms'?textLinkDestinations(input.smsBody):input.links.map(link=>link.destinationUrl);
  for(const destinationUrl of new Set(destinations)){
   if(contactLink(destinationUrl))continue;
   if(!safeEmailUrl(destinationUrl)||!allowedLinkHost(new URL(destinationUrl).hostname,platform.config.allowedLinkHosts))throw new Error('Tracked destination is outside the approved URL policy.');
   const tagged=analyticsUrl(destinationUrl,input.analytics,input.channel);
   if(!input.enabled){rewritten.set(destinationUrl,tagged);continue;}
   // Clicks are recorded until 30 days after send-by; the redirect itself keeps forwarding.
   const expiresAt=new Date(input.sendByAt.getTime()+30*86400000),token=await platform.publicTokens.issue({id:crypto.randomUUID(),purpose:'link',expiresAt});
   trackedLinks.push({tokenDigest:await platform.publicTokens.digest(token),destinationUrl:tagged,originalDestinationUrl:destinationUrl,expiresAt});
   rewritten.set(destinationUrl,`${origin}/l/${encodeURIComponent(token)}`);
  }
 }
 return {trackedLinks,rewritten};
}
