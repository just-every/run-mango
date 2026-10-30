import {useEffect,useState} from 'react';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import {Can} from '@/core/features/auth/ui/permissions';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
import type {ReportDefinition,SavedReportData} from '../saved-report-model';
type Inventory={reports:(ReportDefinition&{id:string;title:string})[];operators:{id:string;email:string}[];schedules:{id:string;reportId:string;cadence:string;nextAt:number;active:boolean;recipients:string[]}[];deliveries:{scheduleId:string;dueAt:number;state:string;reason:string|null;count:number}[]};
export function SavedReports(){return <Can permission="settings.manage"><ReportsPanel/></Can>;}
function ReportsPanel() {
  const formatDate = useDateFormatter();
  const {data,error,replace}=useResource<Inventory>('/api/settings/reports'),[ready,setReady]=useState(false),[metric,setMetric]=useState<ReportDefinition['metric']>('providerCost'),[dimension,setDimension]=useState<ReportDefinition['dimension']>('provider');
  const [selected,setSelected]=useState('builtin-costs'),[cadence,setCadence]=useState<'weekly'|'monthly'>('weekly'),[recipients,setRecipients]=useState<string[]>([]),[report,setReport]=useState<SavedReportData>(),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>setReady(true),[]);
  async function refresh(){const result=await requestJson<Inventory>('/api/settings/reports');if(result.status<400)replace(result.data);}
  async function save(){setBusy(true);try{const result=await requestJson<{id:string}>('/api/settings/reports',{method:'POST',body:JSON.stringify({metric,dimension})});if(result.status>=400){setNotice('Report could not be saved.');return;}await refresh();setSelected(result.data.id);setNotice('Custom report saved.');}catch{setNotice('Report could not be saved.');}finally{setBusy(false);}}
  async function preview(){setBusy(true);try{const result=await requestJson<{report:SavedReportData}>(`/api/settings/reports/${encodeURIComponent(selected)}/read`);if(result.status<400){setReport(result.data.report);setNotice('Report preview ready.');}else setNotice('Report could not be read.');}catch{setNotice('Report could not be read.');}finally{setBusy(false);}}
  async function schedule(){setBusy(true);try{const result=await requestJson(`/api/settings/reports/schedules`,{method:'POST',body:JSON.stringify({reportId:selected,cadence,recipients})});if(result.status<400){await refresh();setNotice('Email schedule saved.');}else setNotice('Choose existing operators and a saved report.');}catch{setNotice('Schedule could not be saved.');}finally{setBusy(false);}}
  async function toggle(id:string,enabled:boolean){setBusy(true);try{const result=await requestJson(`/api/settings/reports/schedules/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({enabled})});if(result.status<400){await refresh();setNotice(enabled?'Schedule enabled with your current authority.':'Schedule paused.');}else setNotice('Schedule could not be changed.');}finally{setBusy(false);}}
  const cost=['providerCost','billableUnits'].includes(metric);
  return <section id="saved-reports" className="panel page-flow" aria-labelledby="saved-reports-title">
    <header><p className="eyebrow">Operator reports</p><h2 id="saved-reports-title">Saved reports and email schedules</h2><p>Owner and Admin only. Reports contain aggregate figures, never contact identities or per-contact rows. Recipients must be existing active operators.</p></header>
    {error?<p role="alert">Saved reports could not be loaded.</p>:!data?<p role="status">Loading saved reports…</p>:<>
      <fieldset disabled={!ready||busy}><legend>Save a custom report</legend>
        <label>Report metric<select value={metric} onChange={event=>{const value=event.target.value as ReportDefinition['metric'];setMetric(value);if(!['providerCost','billableUnits'].includes(value))setDimension('channel');}}><option value="providerCost">Provider cost</option><option value="billableUnits">Provider billable units</option><option value="humanClicks">Human clicks</option><option value="conversions">Attributed conversions</option><option value="attributedRevenueUsd">Attributed USD revenue</option></select></label>
        <label>Report dimension<select value={dimension} onChange={event=>setDimension(event.target.value as ReportDefinition['dimension'])}>{cost?<option value="provider">Provider</option>:null}<option value="channel">Channel</option></select></label>
        <button type="button" className="secondary-action" onClick={()=>void save()}>Save custom report</button>
      </fieldset>
      <fieldset disabled={!ready||busy}><legend>Read or schedule a report</legend>
        <label>Saved report<select value={selected} onChange={event=>{setSelected(event.target.value);setReport(undefined);}}>{data.reports.map(value=><option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
        <button type="button" className="secondary-action" onClick={()=>void preview()}>Preview last 7 UTC days</button>
        <label>Email frequency<select value={cadence} onChange={event=>setCadence(event.target.value as 'weekly'|'monthly')}><option value="weekly">Weekly · Monday 09:00 UTC</option><option value="monthly">Monthly · first day 09:00 UTC</option></select></label>
        <fieldset><legend>Operator recipients</legend>{data.operators.map(operator=><label key={operator.id}><input type="checkbox" checked={recipients.includes(operator.id)} onChange={event=>setRecipients(current=>event.target.checked?[...current,operator.id]:current.filter(id=>id!==operator.id))}/>{operator.email}</label>)}</fieldset>
        <p>Weekly reports cover the previous 7 complete UTC days; monthly reports cover the previous UTC month. A known provider deferral waits for its recorded retry time. Uncertain attempts stay for review and are never automatically repeated. Restored schedules need an Owner or Admin to enable them again.</p>
        <button type="button" className="secondary-action" disabled={!recipients.length} onClick={()=>void schedule()}>Schedule email report</button>
      </fieldset>
      {notice?<p role="status">{notice}</p>:null}
      {report?<section aria-label="Saved report preview"><h3>{report.title}</h3><p>{report.from} to {report.to} · UTC</p><p>{report.note}</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Saved report figures"><table className="responsive-table report-table"><thead><tr><th>UTC day</th><th>Dimension</th><th>Metric</th><th>Value</th><th>Currency / unit</th><th>Unpriced / unknown</th></tr></thead><tbody>{report.rows.map((row,index)=><tr key={index}><th scope="row">{row.day}</th><td data-label="Dimension">{row.dimension}</td><td data-label="Metric">{row.metric}</td><td data-label="Value">{row.value??'Unreported'}</td><td data-label="Currency / unit">{row.currency??'No currency'} · {row.unit}</td><td data-label="Unpriced / unknown">{row.unpricedFacts}</td></tr>)}</tbody></table></div>{!report.rows.length?<p>No recorded figures in this period.</p>:null}</section>:null}
      <section aria-label="Report schedules"><h3>Email schedules</h3>{data.schedules.length?data.schedules.map(schedule=><article key={schedule.id}><h4>{data.reports.find(report=>report.id===schedule.reportId)?.title??'Unavailable report'}</h4><p>{schedule.cadence} · next {formatDate(schedule.nextAt)} · {schedule.active?'Active':'Paused or restored authority needs review'} · {schedule.recipients.length} operator recipients</p><button type="button" className="secondary-action" disabled={busy} onClick={()=>void toggle(schedule.id,!schedule.active)}>{schedule.active?'Pause schedule':'Enable schedule'}</button></article>):<p>No email schedules yet.</p>}</section>
      <section aria-label="Report delivery history"><h3>Delivery history</h3>{data.deliveries.length?data.deliveries.map((row,index)=><p key={index}>{formatDate(row.dueAt)} · {row.count} {row.state}{row.reason?` · ${row.reason}`:''}</p>):<p>No report delivery attempts yet.</p>}</section>
      <p>Slack delivery is not configured. Other report families and additional dimensions are not available for scheduling yet.</p>
    </>}
  </section>;
}
