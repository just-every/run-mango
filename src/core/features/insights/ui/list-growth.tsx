import { useState, type FormEvent } from 'react';
import { Disclosure } from '@/core/app/client/ui/disclosure';
import { useResource } from '@/core/app/client/lib/use-resource';
import type { ListGrowthReport } from '../list-growth';
import './report-tables.css';

const labels: Record<string,string> = {
  capture:'Consent captured',confirmation:'Consent confirmed',subscription:'New subscription',
  resubscribe:'Resubscription',unsubscribe:'Unsubscription',suppression:'Suppression',
  erasure:'Erasure',removal:'Contact removal','merge-correction':'Merge correction','status-correction':'Status correction',
};

export function ListGrowth() {
  const [period,setPeriod] = useState({from:'',to:''});
  const [filter,setFilter] = useState('');
  const [invalid,setInvalid] = useState(false);
  const {data,error,loading} = useResource<ListGrowthReport>(`/api/insights/list-growth${filter}`);
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const days = (Date.parse(period.to)-Date.parse(period.from))/86400000+1;
    if (!Number.isFinite(days) || days<1 || days>366) {setInvalid(true);return;}
    setInvalid(false);setFilter(`?${new URLSearchParams(period)}`);
  }
  return <section className="panel page-flow" aria-labelledby="list-growth-title">
    <header><p className="eyebrow">Audience</p><h2 id="list-growth-title">List growth and consent sources</h2>
      <p>Subscribed contacts per channel, counted when membership changes in this installation. Captures and confirmations are separate events and do not add subscribers twice.</p></header>
    <form onSubmit={submit} className="test-send-fields" aria-label="List growth period">
      <label>From (UTC)<input type="date" required value={period.from} onChange={event=>setPeriod({...period,from:event.target.value})}/></label>
      <label>Through (UTC)<input type="date" required value={period.to} onChange={event=>setPeriod({...period,to:event.target.value})}/></label>
      <button type="submit" className="secondary-action">Apply dates</button>
    </form>
    {invalid?<p role="alert">Choose an ordered date range of at most 366 days.</p>:null}
    {loading?<p role="status">Loading list growth…</p>:error?<p role="alert">List growth could not be loaded.</p>:data?<>
      <p>Selected period: {data.from} through {data.to} (UTC). Recording began {data.coveredFrom}. Earlier daily growth is unavailable; the opening baseline is the subscribed membership at that time.</p>
      {!data.effectiveFrom?<p>No recorded coverage in this period.</p>:<>
        <p>Covered from {data.effectiveFrom} through {data.asOf}. The first and current day may be partial.</p>
        <div className="table-scroll" role="region" tabIndex={0} aria-label="Subscribed membership totals"><table className="responsive-table report-table" aria-label="Subscribed membership totals">
          <thead><tr><th>Channel</th><th>Opening</th><th>Net change</th><th>Closing</th></tr></thead>
          <tbody>{data.channels.map(row=><tr key={row.channel}><th scope="row">{row.channel==='email'?'Email':'SMS'}</th><td data-label="Opening">{row.opening}</td><td data-label="Net change">{row.net>0?'+':''}{row.net}</td><td data-label="Closing">{row.closing}</td></tr>)}</tbody>
        </table></div>
        <div className="table-scroll" role="region" tabIndex={0} aria-label="Daily list growth by source"><table className="responsive-table report-table" aria-label="Daily list growth by source">
          <thead><tr><th>Day / channel</th><th>Source</th><th>Event</th><th>Events</th><th>Membership change</th><th>Consent disclosure</th></tr></thead>
          <tbody>{data.rows.map((row,index)=><tr key={index}><th scope="row">{row.day} · {row.channel}</th><td data-label="Source">{row.source}<br/>{row.method}</td><td data-label="Event">{labels[row.kind]??row.kind}</td><td data-label="Events">{row.count}</td><td data-label="Net change">{row.net>0?'+':''}{row.net}</td><td data-label="Consent">{row.version!==null?<Disclosure title={`Consent version: ${row.version}`}><p style={{overflowWrap:'anywhere',whiteSpace:'pre-wrap'}}>{row.consentText || 'Consent wording was not recorded.'}</p></Disclosure>:'Evidence removed or not recorded'}</td></tr>)}</tbody>
        </table></div>
        {!data.rows.length?<p>No membership or consent events were recorded in this period.</p>:null}
      </>}
      <Disclosure title="How these counts work"><p>Opening membership plus the sum of membership changes equals closing membership for each channel. Repeated writes of the same status add no growth. Imports count when applied here, even when the original opt-in was earlier. Suppressions, removals, merges and other status corrections are shown separately from unsubscriptions.</p><p>Source and consent wording come from retained evidence. Erasure removes evidence links and keeps anonymous counts; those rows then show evidence removed or not recorded. No subscriber identities appear in this report.</p><p>This report covers existing capture, import and integration writes. Dedicated kiosk reporting and the new public-form resubscribe journey are not yet available. A contact changed directly from unsubscribed to subscribed is counted as a resubscription.</p></Disclosure>
    </>:null}
  </section>;
}
