import type {CatalogSummary} from '../catalog-outcomes';
export function CatalogCounts({summary}:{summary?:CatalogSummary}){
 if(!summary||!summary.hidden.length&&!summary.skipped.length&&!summary.emptyBlocks)return null;
 return <section className="panel" aria-label="Catalog outcomes"><h2>Catalog outcomes</h2><dl className="detail-list">{summary.hidden.map(row=><div key={row.reason}><dt>{row.reason}</dt><dd data-catalog-reason={row.reason}>{row.count}</dd></div>)}{summary.emptyBlocks?<div><dt>Empty blocks hidden</dt><dd>{summary.emptyBlocks}</dd></div>:null}{summary.skipped.map(row=><div key={row.reason}><dt>{row.reason}</dt><dd data-catalog-reason={row.reason}>{row.count}</dd></div>)}</dl></section>;
}
