import {flattenPredicates,type InclusionRule,type ExclusionRule} from '@/core/features/lifecycle/rules';
import type {createAudienceRepository} from './repository';
import type {SourceFreshnessIssue} from '@/core/features/store/service';
import {hasZip} from './geo';
export async function segmentAvailability(repository:ReturnType<typeof createAudienceRepository>,inclusion:InclusionRule,exclusions:ExclusionRule[]):Promise<SourceFreshnessIssue[]> {
  const issues:SourceFreshnessIssue[]=[];
  const predicates=[...flattenPredicates(inclusion),...exclusions.map(rule=>rule.predicate)];
  for(const p of predicates) {
    if(p.sourceType==='contact'&&p.field==='distanceMiles'&&!hasZip(p.originZip!))issues.push({sourceType:'customer',reason:'source-unavailable',detail:`Origin ZIP ${p.originZip} has no Census ZIP-area point; distance is unavailable.`});
    if(p.sourceType==='order'&&(p.field==='boughtCollectionId'||p.field==='boughtCategory')&&!await repository.segmentCatalogCoverage(p.field))issues.push({sourceType:'product',reason:'source-unavailable',detail:`${p.field==='boughtCollectionId'?'Collection':'Category'} purchase conditions require recorded catalog ${p.field==='boughtCollectionId'?'collection IDs':'categories'}; the connected source does not provide complete data.`});
  }
  return issues;
}
