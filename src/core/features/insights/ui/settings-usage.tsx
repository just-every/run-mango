import {ReviewLoyaltySettings} from '@/core/features/integrations/reviews-loyalty/settings';
import { SettingsPage } from '@/core/features/store/ui/settings-page';
import { useResource } from '@/core/app/client/lib/use-resource';
import { Link, useLoaderData } from '@tanstack/react-router';
import { Can, usePermissions } from '@/core/features/auth/ui/permissions';
import { CostTotals } from './cost-totals';
import type { CostReport } from '../cost-report';
import type { UsageReport } from '../usage-report';
import './report-tables.css';
const money=(micros:number|string,currency:string)=>`${currency} ${(Number(micros)/1000000).toLocaleString(undefined,{maximumFractionDigits:6})}`;

export function SettingsUsage() {return <Can permission="report.read"><UsagePanel/></Can>;}
function UsagePanel() {
  const {data,error,loading}=useResource<{costs:CostReport;usage:UsageReport}>('/api/insights');
  return <section id="usage" className="page-flow panel" aria-labelledby="usage-title">
    <header><p className="eyebrow">Settings</p><h2 id="usage-title">Usage and provider costs</h2>
      <p>Contact counts describe this installation. Mango does not bill or limit sending by contact count. Your provider reports its own charges.</p></header>
    {loading?<p role="status">Loading usage…</p>:error?<p role="alert">Usage could not be loaded.</p>:data?<>
      <p>{data.usage.totalContacts.toLocaleString()} contacts · Observed {data.usage.asOf}</p>
      <div className="table-scroll" role="region" tabIndex={0} aria-label="Contacts by channel consent state"><table className="responsive-table report-table"><thead><tr><th>Channel</th><th>Consent state</th><th>Contacts</th></tr></thead>
        <tbody>{data.usage.consent.map(row=><tr key={`${row.channel}:${row.state}`}><th scope="row">{row.channel==='email'?'Email':'SMS'}</th><td data-label="Consent state">{row.state}</td><td data-label="Contacts">{row.contacts.toLocaleString()}</td></tr>)}</tbody></table></div>
      <section aria-label="Projected month"><h3>Projected month · UTC run rate</h3>
        <p>Projection, not a provider bill or an observed result: the priced month-to-date subtotal divided by elapsed UTC month time, extended to the full month. Unpriced facts are excluded, never treated as zero. Currencies stay separate; no conversion is applied.</p>
        <p>{data.usage.monthStart} to {data.usage.monthEnd} · observed through {data.usage.asOf}.</p>
        {data.usage.projection.length?data.usage.projection.map(row=><p key={row.currency??'unreported'} data-projection-currency={row.currency??'unreported'}>
          <strong>{row.currency??'Currency unreported'}</strong>: {row.reportedCostMicros===null||!row.currency?'No reported price':`${money(row.reportedCostMicros,row.currency)} priced month-to-date subtotal`}
          {' · '}{row.projectedCostMicros===null||!row.currency?'Projection unavailable':`${money(row.projectedCostMicros,row.currency)} projected month`}
          {' · '}{row.unpricedFacts} unpriced facts
        </p>):<p>No provider cost facts this month; projection unavailable.</p>}
      </section>
      <p>No flows yet. Costs grouped under a flow will be available when flows send messages.</p>
      <CostTotals report={data.costs}/>
    </>:null}
  </section>;
}

/** Activity and the store connection are configuration, so Settings leads to them and the main menu does not. */
function SettingsLinks() {
  const {can}=usePermissions(), {modules}=useLoaderData({from:'/app'});
  return <nav className="settings-links" aria-label="Settings reports"><a className="text-link" href="#usage">Usage and costs</a>
    {can('activity.read')?<Link className="text-link" to="/app/settings/activity">Activity</Link>:null}
    {modules.store&&can('integration.manage')?<Link className="text-link" to="/app/store">Store</Link>:null}</nav>;
}

export function SettingsWithUsage(){return <div className="page-flow"><SettingsLinks/><SettingsPage/><ReviewLoyaltySettings/><SettingsUsage/></div>;}
