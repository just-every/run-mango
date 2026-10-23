import type {CommerceSourceType,SourceFreshnessIssue} from '@/core/features/store/service';
import {flattenPredicates,type InclusionRule,type ExclusionRule} from '@/core/features/lifecycle/rules';
export type CoverageStore = {
  intervalCoverage?:(types:CommerceSourceType[],from:Date,now:Date)=>Promise<SourceFreshnessIssue[]>;
  observationCoverage?:(sourceType:'cart'|'browsing-event',from:Date,purpose:'positive'|'absence')=>Promise<SourceFreshnessIssue[]>;
};
export async function productCoverage(store:CoverageStore, products:string[],now:Date) {
  if(!products.length)return [];
  // Unresolved returns have no expiry: a recent sync is not historical coverage.
  return store.intervalCoverage ? store.intervalCoverage(['order','refund'],new Date(0),now)
    : [{sourceType:'order' as const,reason:'source-unavailable' as const,detail:'Product exclusions require complete order, refund and return history.'}];
}
export async function ruleCoverage(store:CoverageStore,inclusion:InclusionRule,exclusions:ExclusionRule[],now:Date) {
  const issues:SourceFreshnessIssue[]=[];
  for(const p of [...flattenPredicates(inclusion),...exclusions.map(e=>e.predicate)]) {
    if((p.sourceType==='order'&&(p.field==='count'||p.field.startsWith('bought')))||(p.sourceType==='contact'&&p.field.startsWith('rfm'))) {
      const types:CommerceSourceType[]=p.sourceType==='contact'?['order','refund']:['order'];
      const from=new Date(p.lookbackDays===undefined?0:now.getTime()-p.lookbackDays*86_400_000);
      if(store.intervalCoverage)issues.push(...await store.intervalCoverage(types,from,now));
      else issues.push({sourceType:'order',reason:'source-unavailable',detail:'Order conditions require recorded coverage for the complete selected interval.'});
    }
    if(p.sourceType!=='cart'&&p.sourceType!=='browsing')continue;
    const sourceType=p.sourceType==='browsing'?'browsing-event':'cart';
    const window=p.lookbackDays??(['cart','browsing'].includes(p.sourceType)?90:undefined);
    const from=new Date(window===undefined?0:now.getTime()-window*86_400_000);
    const purpose=p.comparator==='neq'?'absence':'positive';
    if(store.observationCoverage) issues.push(...await store.observationCoverage(sourceType,from,purpose));
    else issues.push({sourceType,reason:'source-unavailable',detail:'Observed source interval coverage is unavailable.'});
  }
  return issues;
}
