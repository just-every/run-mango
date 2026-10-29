import type {Platform} from '@/core/shared/platform';
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export async function resourceLink(platform:Platform,kind:string,args:Record<string,unknown>,result:unknown){
  const value=object(result),family=kind.split('.')[0],enc=(v:unknown)=>encodeURIComponent(String(v));
  let target=args.id??value.campaignId??value.id??object(value.revision).campaignId??object(value.segment).id??object(value.contact).id??object(value.job).id??object(value.asset).id;
  if(family==='campaigns'&&args.revisionId&&!args.id){
    const row=await platform.database.$client.prepare('SELECT campaign_id FROM campaign_revisions WHERE id=?').bind(args.revisionId).first<{campaign_id:string}>();target=row?.campaign_id??target;
  }
  if(kind==='designs.start')target=object(value.job).id;
  if(kind==='proposals.generate')target=value.proposalId;
  if(kind==='segments.delete'){
    const audit=await platform.database.$client.prepare("SELECT id FROM lifecycle_audit_entries WHERE entity_type='audience-segment' AND entity_id=? AND action='segment.deleted' ORDER BY occurred_at DESC,id DESC LIMIT 1").bind(args.id).first<{id:string}>();
    return audit?'mango://activity/'+enc(audit.id):null;
  }
  if(kind==='contacts.erase')return object(value.receipt).reference?'mango://erasures/'+enc(object(value.receipt).reference):null;
  if(family==='publications')return 'mango://campaigns/'+enc(args.id);
  if(family==='sender')return 'mango://sender/readiness';
  if(family==='store')return 'mango://store/readiness';
  if(family==='connections')return 'mango://connections/sending';
  if(family==='signup')return 'mango://signup/newsletter';
  if(family==='reports')return 'mango://reports/schedules/'+enc(target);
  return target?'mango://'+family+'/'+enc(target):null;
}
