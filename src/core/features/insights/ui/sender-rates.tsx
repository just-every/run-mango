import {MailboxProviders} from './mailbox-providers';
import type {MailboxReport} from '../mailbox-report';
import {useEffect} from 'react';
import {useDateFormatter} from '@/core/app/client/lib/use-date-formatter';
import {useResource} from '@/core/app/client/lib/use-resource';
type Rate={channel:string;providers:string[];sender:string;windowStart:string;delivered:number;complained:number;hardBounced:number;attempted:number;complaintRate:number|null;hardBounceRate:number|null};
export function SenderRates() {
  const dateTime=useDateFormatter({locale:undefined,options:{year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'}});
  const {data,error,reload}=useResource<{windowDays:number;senders:Rate[];mailboxes:MailboxReport}>('/api/insights/deliverability');
  useEffect(()=>{const timer=setInterval(()=>void reload(),20000);return()=>clearInterval(timer);},[reload]);
  return <><section className="panel"><h2>Sender reputation</h2>
    <p>Marketing outcomes combined across providers for each From domain or SMS sender, using the same totals as the local reputation guard. Test messages do not contribute; acceptance is not delivery.</p>
    {error?<p role="alert">Reputation could not be refreshed.</p>:null}
    {data?<><p>Reporting window: {data.windowDays} days{data.senders[0]?<>, since <time dateTime={data.senders[0].windowStart}>{dateTime(data.senders[0].windowStart)}</time></>:null}.</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Sender reputation rates"><table className="responsive-table insights-table" aria-label="Sender reputation rates"><thead><tr><th scope="col">Domain or sender</th><th scope="col">Provider scope</th><th scope="col">Complaints / delivered</th><th scope="col">Hard bounces / attempts</th></tr></thead><tbody>
      {data.senders.map(row=><tr key={`${row.channel}:${row.sender}`}><th scope="row">{row.sender} ({row.channel})</th><td data-label="Provider scope">{row.providers.join(', ')}</td><td data-label="Complaints / delivered">{row.complained} / {row.delivered} ({row.complaintRate===null?'rate unavailable: no delivered messages in this window':`${(row.complaintRate*100).toFixed(2)}%`})</td><td data-label="Hard bounces / attempts">{row.hardBounced} / {row.attempted} ({row.hardBounceRate===null?'rate unavailable: no attempts in this window':`${(row.hardBounceRate*100).toFixed(2)}%`})</td></tr>)}
    </tbody></table></div></>:<p>Loading recorded rates…</p>}
  </section><MailboxProviders report={data?.mailboxes} windowDays={data?.windowDays} error={error}/></>;
}
