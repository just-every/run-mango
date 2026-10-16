import { Link } from '@tanstack/react-router';
import { StatusPill } from '@/core/app/client/ui/layout';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
export type ContactRelatedData={
  sourceActivity:{id:string;kind:string;state:string;occurredAt:string}[];
  suppressions:{id:string;channel:string;cause:string;occurredAt:string}[];
  campaignHistory:{id:string;campaignId:string;name:string;channel:string;disposition:string;skipReason:string|null;createdAt:number}[];
};
export function ContactRelated({data}:{data:ContactRelatedData}) {
  const formatDate = useDateFormatter();
  return <><section className="panel"><h2>Source activity</h2>{data.sourceActivity.length?data.sourceActivity.map(item=><p key={item.id}>{item.kind} · {item.state} · {formatDate(item.occurredAt)}</p>):<p>No source activity recorded.</p>}</section>
    <section className="panel"><h2>Suppressions</h2>{data.suppressions.length?data.suppressions.map(item=><p key={item.id}>{item.channel} · {item.cause} · {formatDate(item.occurredAt)}</p>):<p>No suppressions recorded.</p>}</section>
    <section className="panel audience-ledger"><h2>Campaign history</h2>{data.campaignHistory.length?<div className="table-scroll"><table className="responsive-table audience-ledger__table"><thead><tr><th scope="col">Campaign</th><th scope="col">Channel</th><th scope="col">Outcome</th></tr></thead><tbody>{data.campaignHistory.map(item=><tr key={item.id}><th scope="row"><Link to="/app/campaigns/$id" params={{id:item.campaignId}}>{item.name}</Link></th><td data-label="Channel">{item.channel}</td><td data-label="Outcome"><StatusPill value={item.disposition}/>{item.skipReason?<p>{item.skipReason}</p>:null}</td></tr>)}</tbody></table></div>:<p>No campaign history recorded.</p>}</section></>;
}
