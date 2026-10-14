import {useEffect} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
type Rate={channel:string;providers:string[];sender:string;windowStart:string;delivered:number;complained:number;hardBounced:number;attempted:number;complaintRate:number|null;hardBounceRate:number|null};
export function SenderRates() {
  const {data,error,reload}=useResource<{windowDays:number;senders:Rate[]}>('/api/insights/deliverability');
  useEffect(()=>{const timer=setInterval(()=>void reload(),20000);return()=>clearInterval(timer);},[reload]);
  return <section className="panel"><h2>Sender reputation</h2>
    <p>Marketing outcomes combined across providers for each From domain or SMS sender, using the same totals as the local reputation guard. Test messages do not contribute; acceptance is not delivery.</p>
    {error?<p role="alert">Reputation could not be refreshed.</p>:null}
    {data?<><p>Reporting window: {data.windowDays} days{data.senders[0]?<>, since <time dateTime={data.senders[0].windowStart}>{new Date(data.senders[0].windowStart).toLocaleString()}</time></>:null}.</p><div className="table-scroll"><table><thead><tr><th>Domain or sender</th><th>Provider scope</th><th>Complaints / delivered</th><th>Hard bounces / attempts</th></tr></thead><tbody>
      {data.senders.map(row=><tr key={`${row.channel}:${row.sender}`}><th>{row.sender} ({row.channel})</th><td>{row.providers.join(', ')}</td><td>{row.complained} / {row.delivered} ({row.complaintRate===null?'rate unavailable: no delivered messages in this window':`${(row.complaintRate*100).toFixed(2)}%`})</td><td>{row.hardBounced} / {row.attempted} ({row.hardBounceRate===null?'rate unavailable: no attempts in this window':`${(row.hardBounceRate*100).toFixed(2)}%`})</td></tr>)}
    </tbody></table></div></>:<p>Loading recorded rates…</p>}
  </section>;
}
