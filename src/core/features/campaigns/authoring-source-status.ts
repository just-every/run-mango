import type { createStoreService } from '@/core/features/store/service';

const sourceLabels: Record<string, string> = {
  customer: 'Customer', product: 'Product', variant: 'Variant', inventory: 'Inventory',
  order: 'Order', refund: 'Refund', cart: 'Cart', browsing: 'Browsing', 'browsing-event': 'Browsing',
};

/** Authoring surfaces expose actionable status, never persisted provider diagnostics. */
export function authoringSourceIssues(issues: readonly {sourceType: string; reason: string}[]) {
  return [...new Set(issues.map(issue => {
    const source = Object.hasOwn(sourceLabels, issue.sourceType) ? sourceLabels[issue.sourceType] : 'Required store';
    if (issue.reason === 'source-unavailable') return `${source} source is unavailable. Check commerce settings and enable this source, then sync it.`;
    if (issue.reason === 'source-not-synced') return `${source} source has not synced successfully. Sync it before continuing.`;
    if (issue.reason === 'source-sync-failed') return `${source} source sync failed. Check commerce settings, then sync it successfully before continuing.`;
    if (issue.reason === 'source-sync-queued') return `${source} source sync is queued. Wait for it to complete before continuing.`;
    if (issue.reason === 'source-sync-running') return `${source} source sync is in progress. Wait for it to complete before continuing.`;
    if (issue.reason === 'source-stale') return `${source} source is out of date. Sync it before continuing.`;
    if (issue.reason === 'source-not-current') return `${source} source is not current or its sync failed. Check commerce settings and sync it successfully before continuing.`;
    return `${source} evidence could not be verified. Check commerce settings and sync it before continuing.`;
  }))].join(' ');
}

/** Keep operational diagnostics in the store; project safe source status at the authoring boundary. */
export function authoringSourceStatus(status: Awaited<ReturnType<ReturnType<typeof createStoreService>['status']>>) {
  const sourceError = (sourceType:string, reason='source-sync-failed') => authoringSourceIssues([{sourceType,reason}]);
  return {
    ...status,
    sourceSyncs: status.sourceSyncs.map(source=>{
      const active=status.syncRuns.find(run=>run.sourceType===source.sourceType && (run.state==='queued'||run.state==='running'));
      return {...source,lastError:source.lastError ? sourceError(source.sourceType,active?`source-sync-${active.state}`:'source-sync-failed') : null};
    }),
    sourceCapabilities:status.sourceCapabilities.map(source=>({...source,detail:source.available
      ? `${Object.hasOwn(sourceLabels,source.sourceType)?sourceLabels[source.sourceType]:'Store'} source is available.`
      : sourceError(source.sourceType,'source-unavailable')})),
    syncRuns:status.syncRuns.map(run=>({...run,lastError:run.lastError?sourceError(run.sourceType):null})),
  };
}

/** Older saved checks may still contain the original provider error. */
export function authoringSourceCheck<T extends {kind:string;blocking:boolean;detail:string}>(check:T,sourceTypes:readonly string[]):T {
  return check.kind==='audience.resolution' && check.blocking && sourceTypes.length
    ? {...check,detail:authoringSourceIssues(sourceTypes.map(sourceType=>({sourceType,reason:'source-not-current'})))}
    : check;
}
