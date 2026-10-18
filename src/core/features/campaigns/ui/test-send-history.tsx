import {useResource} from '@/core/app/client/lib/use-resource';
import {useDateFormatter} from '@/core/app/client/lib/use-date-formatter';
import {useEffect} from 'react';

export function TestSendHistory({campaignId,refresh}:{campaignId:string;refresh?:string}) {
  const {data,reload}=useResource<{tests:Array<{destination?:string;channel:string;operatorId:string;operatorName:string;occurredAt:string}>}>(`/api/campaigns/${campaignId}/test-sends`);
  const format=useDateFormatter();
  useEffect(()=>{if(!refresh)void reload();},[refresh]);
  if(!data?.tests.length)return null;
  return <section aria-label="Test send history"><h3>Recent test sends</h3><ul>{data.tests.map((item,index)=><li key={index}>
    {item.destination??'Destination not retained'} · {item.channel} · {format(item.occurredAt)} · {item.operatorName}
  </li>)}</ul></section>;
}
