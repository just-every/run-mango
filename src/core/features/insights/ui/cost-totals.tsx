import { Link } from '@tanstack/react-router';
import { useResource } from '@/core/app/client/lib/use-resource';
import type { CostGroup, CostReport } from '../cost-report';

function groupRows<T, K>(rows: T[], key: (row: T) => K) {
  const groups = new Map<K, T[]>();
  for (const row of rows) { const value = key(row); const entries = groups.get(value); if (entries) entries.push(row); else groups.set(value, [row]); }
  return groups;
}

const price = (micros: number, currency: string) => `${currency} ${(micros / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
function CostTable({rows, daily = false}: {rows: CostGroup[]; daily?: boolean}) {
  const groups = groupRows(rows, row => daily ? row.day : row.campaignId);
  return <>{Array.from(groups, ([key, entries]) => {
    const unpriced = entries.reduce((n,row) => n + row.unpricedFacts,0);
    const currencies = groupRows(entries.filter(row => row.currency && row.reportedCostMicros != null), row => row.currency!);
    return <section key={key ?? 'unassigned'} className="panel data-table-panel">
      <div className="section-heading"><div><h3>{daily ? `${key} UTC` : key ? <Link to="/app/campaigns/$id" params={{id:key}}>Campaign {key}</Link> : 'No campaign assigned'}</h3>
        <p>{currencies.size ? Array.from(currencies,([currency, facts]) => `${price(facts.reduce((n,row)=>n+(row.reportedCostMicros??0),0),currency)} ${unpriced ? 'priced subtotal' : 'reported total'}`).join(' · ') : 'No reported price'} · {unpriced} unpriced attempt records</p>
      </div></div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label={daily ? `Costs on ${key} UTC` : 'Campaign cost details'}><table className="responsive-table">
        <thead><tr><th scope="col">Provider / model or channel</th><th scope="col">Operation</th><th scope="col">Usage</th><th scope="col">Reported price</th><th scope="col">Missing reports</th></tr></thead>
        <tbody>{entries.map((row,index) => <tr key={index}>
          <th scope="row">{row.provider} / {row.modelOrChannel}</th><td data-label="Operation">{row.operation}</td>
          <td data-label="Usage">{row.billableUnits == null ? 'Unknown' : `${row.billableUnits.toLocaleString()} ${row.unitKind}`}</td>
          <td data-label="Reported price">{row.reportedCostMicros == null || !row.currency ? 'Not reported' : `${price(row.reportedCostMicros,row.currency)}${row.unpricedFacts ? ' priced subtotal' : ''}`}</td>
          <td data-label="Missing reports">{row.unknownUsageFacts} unknown usage · {row.unpricedFacts} unpriced · {row.uncertainFacts} uncertain attempts{row.preparedFacts ? ` · ${row.preparedFacts} prepared; provider invocation or cost recording unconfirmed` : ''}</td>
        </tr>)}</tbody>
      </table></div>
    </section>;
  })}</>;
}
export function CostTotals({report}: {report: CostReport}) {
  return <section className="page-flow" aria-labelledby="external-costs-title">
    <div className="section-heading"><div><p className="eyebrow">External costs</p><h2 id="external-costs-title">Reported spend and usage</h2>
      <p>Days run from midnight to midnight UTC. Prices are provider reports, never estimates. Unpriced attempt records are excluded from priced subtotals; unknown usage is not zero. Interrupted attempt records do not prove that the provider was called. Currencies and unit kinds stay separate.</p></div></div>
    {!report.byDay.length ? <p>No external requests recorded yet.</p> : <>
      <h3>By campaign</h3><CostTable rows={report.byCampaign} />
      <h3>By day (UTC)</h3><CostTable rows={report.byDay} daily />
    </>}
  </section>;
}
export function CampaignCosts({campaignId}: {campaignId:string}) {
  const {data,error,loading} = useResource<{costs: CostGroup[]}>(`/api/campaigns/${campaignId}/results`);
  return <section className="page-flow" aria-label="Campaign external costs"><h2>External costs</h2>
    {loading ? <p>Loading costs…</p> : error ? <p role="alert">Costs could not be loaded.</p> : data?.costs.length ? <CostTable rows={data.costs} /> : <p>No external requests recorded for this campaign.</p>}
  </section>;
}
