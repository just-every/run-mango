import { escapeHtml } from './email-html-policy';
import type { Database } from '@/core/platform/db/client';
import type { createStoreService, CommerceSourceType } from '@/core/features/store/service';
import { authoringSourceIssues } from './authoring-source-status';

type SourceRow = {id:string; source_type:string; provider_source_id:string; payload:string; occurred_at:number};
function starter(row:SourceRow) {
  const payload = JSON.parse(row.payload) as Record<string,unknown>;
  const sourceType = row.source_type === 'browsing-event' ? 'browsing' : row.source_type;
  const field = sourceType==='customer' ? (typeof payload.email==='string' ? 'email' : 'segment') : sourceType==='order' && typeof payload.displayFinancialStatus==='string' ? 'displayFinancialStatus' : ['order','cart','browsing'].includes(sourceType) ? 'productId' : sourceType==='product' ? 'title' : undefined;
  if (!field || typeof payload[field]!=='string' || !payload[field]) return undefined;
  const value=payload[field];
  const title=sourceType==='product'?`Product newsletter: ${value}`:sourceType==='customer'?`${field==='email'?'Customer':'Customer segment'}: ${value}`:field==='displayFinancialStatus'?`Order payment status: ${value}`:`${sourceType === 'order' ? 'Purchased' : sourceType === 'cart' ? 'Cart' : 'Viewed'} product: ${value}`;
  return {id:row.id,title:title.length>160?title.slice(0,159)+'…':title,evidence:`Recorded ${row.source_type} ${row.provider_source_id} on ${new Date(row.occurred_at).toISOString()}.`,
    emailBody:sourceType==='product'?`<h2>${escapeHtml(value)}</h2>`:'',
    inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[sourceType==='product'?{sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'}:{sourceType,field,comparator:'eq',value}]}),
    sourceType:row.source_type as CommerceSourceType};
}
export function signalStarters(database:Database,store:ReturnType<typeof createStoreService>,enabled:boolean) {
  return {
    async list() {
      if (!enabled) return {starters:[],detail:'Store starters are unavailable until commerce is connected and synced. Blank newsletters are available.'};
      const rows=await database.$client.prepare('SELECT id,source_type,provider_source_id,payload,occurred_at FROM source_records ORDER BY occurred_at DESC LIMIT 100').all<SourceRow>();
      const starters=[];
      for (const row of rows.results) {
        const item=starter(row); if (!item) continue;
        const issues=await store.freshness([item.sourceType],new Date());
        starters.push({...item,available:!issues.length,detail:authoringSourceIssues(issues)});
      }
      return {starters,detail:starters.length?'':'No recorded customer, product or order activity is available for a starter.'};
    },
    async read(id:string) {
      if (!enabled) return undefined;
      const row=await database.$client.prepare('SELECT id,source_type,provider_source_id,payload,occurred_at FROM source_records WHERE id=?').bind(id).first<SourceRow>();
      if (!row) return undefined;
      const item=starter(row); if (!item || (await store.freshness([item.sourceType],new Date())).length) return undefined;
      return item;
    },
  };
}
