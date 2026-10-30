import {useEffect,useState,type FormEvent} from 'react';
import {Link} from '@tanstack/react-router';
import {useResource} from '@/core/app/client/lib/use-resource';
import {performanceMoney,performanceRate} from '../campaign-performance-model';
import type {OverviewReport} from '../overview-report';
import './report-tables.css';
const delta=(current:number,previous:number)=>`${current-previous>0?'+':''}${current-previous}`;
export function OverviewDashboard() {
  const [ready,setReady]=useState(false);
  useEffect(()=>setReady(true),[]);
  const [period,setPeriod]=useState({from:'',to:''}),[query,setQuery]=useState(''),[invalid,setInvalid]=useState(false);
  const {data,error,loading}=useResource<{overview:OverviewReport}>(`/api/insights${query}`),report=data?.overview;
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const days=(Date.parse(period.to)-Date.parse(period.from))/86400000+1;
    if(!Number.isInteger(days)||days<1||days>366){setInvalid(true);return;}setInvalid(false);setQuery(`?${new URLSearchParams(period)}`);}
  return <section className="panel page-flow" aria-labelledby="overview-title" style={{minWidth:0,overflowWrap:'anywhere'}}>
    <header><p className="eyebrow">Overview</p><h2 id="overview-title">Marketing overview</h2><p>Observed results compared with the previous period of equal length.</p></header>
    <form className="test-send-fields period-fields" aria-label="Overview period" onSubmit={submit}>
      <label>Overview from (UTC)<input type="date" disabled={!ready} required value={period.from} onChange={event=>{const value=event.target.value;setPeriod(current=>({...current,from:value}));}}/></label>
      <label>Overview through (UTC)<input type="date" disabled={!ready} required value={period.to} onChange={event=>{const value=event.target.value;setPeriod(current=>({...current,to:value}));}}/></label>
      <button className="secondary-action" type="submit" disabled={!ready}>Apply overview dates</button>
    </form>
    {invalid?<p role="alert">Choose an ordered range of at most 366 UTC days.</p>:null}
    {loading?<p role="status">Loading overview…</p>:error?<p role="alert">Overview could not be loaded.</p>:report?<>
      <p data-overview-period>Current: {report.current.from} through {report.current.to} · Previous: {report.previous.from} through {report.previous.to} · {report.days} UTC days each.</p>
      <p>{report.note}</p>
      <p>Attribution metric: {report.current.attributionPolicy.metricLabel}; email click window {report.current.attributionPolicy.clickWindowDays.email} days; SMS {report.current.attributionPolicy.clickWindowDays.sms} days.</p>
      <div className="table-scroll" role="region" tabIndex={0} aria-label="Overview period comparison"><table className="responsive-table report-table"><thead><tr><th>Observed metric</th><th>Current</th><th>Previous</th><th>Change</th></tr></thead><tbody>
        <tr data-overview-metric="revenue"><th scope="row">Campaign attributed revenue · USD</th><td data-label="Current">{performanceMoney(report.current.campaignRevenueUsdMinor,'USD')}</td><td data-label="Previous">{performanceMoney(report.previous.campaignRevenueUsdMinor,'USD')}</td><td data-label="Change">{performanceMoney((BigInt(report.current.campaignRevenueUsdMinor)-BigInt(report.previous.campaignRevenueUsdMinor)).toString(),'USD')}</td></tr>
        <tr data-overview-metric="clicks"><th scope="row">Human clicks</th><td data-label="Current">{report.current.clicks}</td><td data-label="Previous">{report.previous.clicks}</td><td data-label="Change">{delta(report.current.clicks,report.previous.clicks)}</td></tr>
        <tr data-overview-metric="conversions"><th scope="row">Attributed conversions · all currencies</th><td data-label="Current">{report.current.conversions}</td><td data-label="Previous">{report.previous.conversions}</td><td data-label="Change">{delta(report.current.conversions,report.previous.conversions)}</td></tr>
        <tr data-overview-metric="growth"><th scope="row">Net subscribed membership · channel total</th><td data-label="Current">{report.current.growth.net??'Unavailable before membership recording'}</td><td data-label="Previous">{report.previous.growth.net??'Unavailable before membership recording'}</td><td data-label="Change">{report.current.growth.net===null||report.previous.growth.net===null?'Unavailable':delta(report.current.growth.net,report.previous.growth.net)}</td></tr>
      </tbody></table></div>
      <section aria-label="Incremental revenue"><h3>Holdout-measured incremental revenue</h3><p>No holdout configured. Incremental revenue is unavailable until holdout experiments exist; attribution above does not measure lift.</p></section>
      <section aria-label="Flow results"><h3>Flow revenue and top flows</h3><p>No flows yet.</p></section>
      <h3>List growth by source</h3><p>Membership recording began {report.current.growth.coveredFrom}; earlier membership is unavailable.</p>
      <div className="table-scroll" role="region" tabIndex={0} aria-label="Overview list growth by source"><table className="responsive-table report-table"><thead><tr><th>Source / channel</th><th>Current net change</th><th>Previous net change</th></tr></thead><tbody>
        {Array.from(new Set([...report.current.growth.sources,...report.previous.growth.sources].map(row=>JSON.stringify([row.source,row.method,row.channel])))).sort().map(key=>{const [source,method,channel]=JSON.parse(key) as string[];const value=(rows:OverviewReport['current']['growth']['sources'])=>rows.find(row=>row.source===source&&row.method===method&&row.channel===channel)?.net??0;return <tr key={key}><th scope="row">{source} · {method} · {channel}</th><td data-label="Current">{report.current.growth.net===null?'Unavailable':value(report.current.growth.sources)}</td><td data-label="Previous">{report.previous.growth.net===null?'Unavailable':value(report.previous.growth.sources)}</td></tr>;})}
      </tbody></table></div>
      <h3>Provider costs in the period</h3><div className="table-scroll" role="region" tabIndex={0} aria-label="Overview provider costs"><table className="responsive-table report-table"><thead><tr><th>Currency / period</th><th>Priced subtotal</th><th>Unpriced facts</th></tr></thead><tbody>{([['Current',report.current],['Previous',report.previous]] as const).flatMap(([name,period])=>period.costs.map(row=><tr key={`${name}:${row.currency}`}><th scope="row">{row.currency??'Currency unreported'} · {name}</th><td data-label="Priced subtotal">{row.reportedCostMicros===null||!row.currency?'Not reported':`${row.currency} ${(row.reportedCostMicros/1000000).toLocaleString(undefined,{maximumFractionDigits:6})}`}</td><td data-label="Unpriced facts">{row.unpricedFacts}</td></tr>))}</tbody></table></div>
      <h3>Deliverability health</h3><div className="table-scroll" role="region" tabIndex={0} aria-label="Overview deliverability health"><table className="responsive-table report-table"><thead><tr><th>Sender / period</th><th>Delivered / bounced / failed</th><th>Complaints / delivered</th><th>Hard bounces / attempts</th></tr></thead><tbody>{([['Current',report.current],['Previous',report.previous]] as const).flatMap(([name,period])=>period.health.map(row=><tr key={`${name}:${row.channel}:${row.sender}`}><th scope="row">{String(row.sender)} · {String(row.channel)} · {name}</th><td data-label="Outcomes">{row.delivered} / {row.bounced} / {row.failed}</td><td data-label="Complaints">{row.complained} / {row.delivered} ({performanceRate(row.complaintRate)})</td><td data-label="Hard bounces">{row.hardBounced} / {row.attempted} ({performanceRate(row.hardBounceRate)})</td></tr>))}</tbody></table></div>
      <h3>Top campaigns by attributed USD revenue</h3>{report.current.topCampaigns.length?<ol>{report.current.topCampaigns.map(row=><li key={row.campaignId}><Link to="/app/campaigns/$id" params={{id:row.campaignId}}>{row.name}</Link> · {performanceMoney(row.netAmountMinor,'USD')}</li>)}</ol>:<p>No campaigns in this period.</p>}
    </>:null}
  </section>;
}
