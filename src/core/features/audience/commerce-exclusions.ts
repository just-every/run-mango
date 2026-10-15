import type {createStoreService} from '@/core/features/store/service';
import {shopMoney} from '@/core/features/insights/commerce-money';
const dayMs=86_400_000;
type RecordRow=Awaited<ReturnType<ReturnType<typeof createStoreService>['sourceRecords']>>[number];
/** Read canonical financial and return state. A return request is not a refund; only a refund whose money is still in flight (PENDING) is unresolved. */
export function commerceExclusions(records:RecordRow[],productIds:string[],now:Date) {
  const reasons=new Set<string>();
  if(!productIds.length) return reasons;
  for(const record of records) {
    if(record.sourceType!=='order'&&record.sourceType!=='refund') continue;
    let p:Record<string,unknown>;
    try {p=JSON.parse(record.payload);} catch {continue;}
    if(p.schema!=='shopify-commerce-v1') continue;
    const lines=Array.isArray(p.lines)?p.lines as Record<string,unknown>[]:[];
    const matching=lines.some(line=>productIds.includes(String(line.productId??(line.line as Record<string,unknown>|undefined)?.productId)));
    if(!matching) continue;
    if(record.sourceType==='order') {
      const purchased=typeof p.processedAt==='string'?Date.parse(p.processedAt):typeof p.createdAt==='string'?Date.parse(p.createdAt):NaN;
      let received=0;
      try {received=shopMoney(p.received).amountMinor;} catch { /* Missing money cannot establish a purchase. */ }
      if(p.test===false&&received>0&&['PAID','PARTIALLY_PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(String(p.financialStatus))&&purchased<=now.getTime()&&purchased>=now.getTime()-7*dayMs) reasons.add('recent-product-purchase');
      if(Array.isArray(p.returns)&&p.returns.some(value=>{
        const returned=value as {status?:unknown;lines?:Array<{line?:{productId?:string}}>};
        return !['CLOSED','CANCELED','CANCELLED','DECLINED'].includes(String(returned.status)) &&
          (!returned.lines?.length || returned.lines.some(line=>productIds.includes(line.line?.productId??'')));
      })) reasons.add('unresolved-return');
      if(Array.isArray(p.refunds)&&p.refunds.some(value=>{const refund=value as {financialState?:unknown;lines?:Array<{line?:{productId?:string}}>};return refund.financialState==='PENDING'&&(!refund.lines?.length||refund.lines.some(line=>productIds.includes(line.line?.productId??'')));})) reasons.add('unresolved-refund');
    } else if(p.financialState==='PENDING') reasons.add('unresolved-refund');
  }
  return reasons;
}
