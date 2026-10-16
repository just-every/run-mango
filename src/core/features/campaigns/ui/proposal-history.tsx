import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import {useState} from 'react';
import type {ProposalDecision,ProposalEntry} from '@/core/app/client/lib/types';
import {titleCase} from '@/core/app/client/lib/format';
import {useResource} from '@/core/app/client/lib/use-resource';
import {LoadState} from '@/core/app/client/ui/layout';
import {ProposalDetail} from './proposal-detail';

function SavedDecision({id}:{id:string}) {
  const {data,error,loading}=useResource<ProposalEntry>(`/api/proposals/${encodeURIComponent(id)}`);
  if(loading||!data)return <LoadState error={error}/>;
  return <ProposalDetail entry={data}/>;
}

export function ProposalHistory({decisions}:{decisions:ProposalDecision[]}) {
  const formatDate = useDateFormatter();
  const [selected,setSelected]=useState<string>();
  if(!decisions.length)return null;
  return <section className="proposal-history" aria-labelledby="proposal-history-title">
    <div className="panel">
      <h2 id="proposal-history-title">Recent proposal decisions</h2>
      <ul>{decisions.map((event,index)=><li key={`${event.proposalId}:${index}`}>
        <button type="button" className="text-link" aria-expanded={selected===event.proposalId} onClick={()=>setSelected(selected===event.proposalId?undefined:event.proposalId)}>{event.title} · {titleCase(event.state)}</button>
        <p>{event.reason} · {event.actorId} · {formatDate(event.occurredAt)}</p>
      </li>)}</ul>
    </div>
    {selected?<SavedDecision key={selected} id={selected}/>:null}
  </section>;
}
