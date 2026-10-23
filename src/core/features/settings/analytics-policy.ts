export type AnalyticsPolicy={enabled:boolean;source:string;emailMedium:string;smsMedium:string;campaign:string;content:string};
export const defaultAnalyticsPolicy:AnalyticsPolicy={enabled:true,source:'mango',emailMedium:'email',smsMedium:'sms',campaign:'',content:''};
export function parseAnalyticsPolicy(value:unknown):AnalyticsPolicy {
  if(!value||typeof value!=='object')throw new Error('invalid_analytics_policy');
  const policy=value as Record<string,unknown>;
  if(Object.keys(policy).sort().join(',')!=='campaign,content,emailMedium,enabled,smsMedium,source'||typeof policy.enabled!=='boolean')throw new Error('invalid_analytics_policy');
  for(const key of ['source','emailMedium','smsMedium','campaign','content']){
    const text=policy[key];
    if(typeof text!=='string'||text.length>64||/[@{}\u0000-\u001f\u007f]/u.test(text)||text!==text.trim())throw new Error('invalid_analytics_value');
    if(['source','emailMedium','smsMedium'].includes(key)&&!text)throw new Error('analytics_value_required');
  }
  return {enabled:policy.enabled,source:policy.source,emailMedium:policy.emailMedium,smsMedium:policy.smsMedium,campaign:policy.campaign,content:policy.content} as AnalyticsPolicy;
}
export type AnalyticsContext={policy:AnalyticsPolicy;campaignName:string;message:string};
export function analyticsContext(revision:{utmPolicyJson?:string|null;name?:string;id?:string}):AnalyticsContext|undefined {
  if(revision.utmPolicyJson==null)return undefined; // Issued and historical revisions retain their original URLs.
  return {policy:parseAnalyticsPolicy(JSON.parse(revision.utmPolicyJson)),campaignName:revision.name??'',message:revision.id??''};
}
const managedPath=/\/(?:unsubscribe|consent|confirm|preferences?|contacts?)(?:\/|$)/i;
export function analyticsUrl(destination:string,context:AnalyticsContext|undefined,channel:'email'|'sms') {
  if(!context?.policy.enabled)return destination;
  let url:URL;try{url=new URL(destination);}catch{return destination;}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||managedPath.test(url.pathname))return destination;
  const policy=context.policy;
  const campaign=policy.campaign||context.campaignName.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64);
  if(!policy.campaign&&/[@{}]/u.test(context.campaignName))throw new Error('campaign_analytics_name_requires_static_default');
  const values={utm_source:policy.source,utm_medium:channel==='email'?policy.emailMedium:policy.smsMedium,utm_campaign:campaign,utm_content:policy.content||context.message.slice(0,64)};
  for(const [key,value] of Object.entries(values))if(!url.searchParams.has(key)&&value)url.searchParams.set(key,value);
  return url.href;
}
