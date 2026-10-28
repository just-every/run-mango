import type {Platform} from '@/core/shared/platform';
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export async function resourceLink(platform:Platform,kind:string,args:Record<string,unknown>,result:unknown){
  const value=object(result),family=kind.split('.')[0],enc=(v:unknown)=>encodeURIComponent(String(v));
  let target=args.id??value.campaignId??value.id??object(value.revision).campaignId??object(value.segment).id??object(value.contact).id??object(value.job).id??object(value.asset).id;
  if(family==='campaigns'&&args.revisionId&&!args.id){
    const row=await platform.database.$client.prepare('SELECT campaign_id FROM campaign_revisions WHERE id=?').bind(args.revisionId).first<{campaign_id:string}>();target=row?.campaign_id??target;
  }
  if(family==='publications')return 'mango://campaigns/'+enc(args.id);
  if(family==='sender')return 'mango://sender/readiness';
  if(family==='store')return 'mango://store/readiness';
  if(family==='connections')return 'mango://connections/sending';
  if(family==='signup')return 'mango://signup/newsletter';
  if(family==='reports')return 'mango://reports/schedules/'+enc(target);
  return target?'mango://'+family+'/'+enc(target):null;
}
