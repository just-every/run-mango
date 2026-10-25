import type {Database} from '@/core/platform/db/client';
export type CatalogSummary={hidden:Array<{reason:string;count:number}>;emptyBlocks:number;skipped:Array<{reason:string;count:number}>};
export async function catalogSummary(database:Database,campaignId:string):Promise<CatalogSummary>{
 const hidden=(await database.$client.prepare("SELECT json_extract(j.value,'$.reason') reason,count(*) count FROM recipient_steps r,json_each(r.outbound_request_json,'$.catalog.hidden') j WHERE r.campaign_id=? AND r.handoff_started_at IS NOT NULL GROUP BY reason").bind(campaignId).all<{reason:string;count:number}>()).results;
 const empty=await database.$client.prepare("SELECT coalesce(sum(json_extract(outbound_request_json,'$.catalog.emptyBlocks')),0) count FROM recipient_steps WHERE campaign_id=? AND handoff_started_at IS NOT NULL").bind(campaignId).first<{count:number}>();
 const skipped=(await database.$client.prepare("SELECT skip_reason reason,count(*) count FROM recipient_steps WHERE campaign_id=? AND transport_disposition='skipped' AND skip_reason IN ('catalog-empty','catalog-unavailable','catalog-blocked') GROUP BY skip_reason").bind(campaignId).all<{reason:string;count:number}>()).results;
 return {hidden,emptyBlocks:empty?.count??0,skipped};
}
export class CatalogDeliverySkip extends Error {constructor(readonly reason:'catalog-empty'|'catalog-unavailable'|'catalog-blocked'){super(reason);}}
