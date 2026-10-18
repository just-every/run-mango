import {useDateFormatter} from '@/core/app/client/lib/use-date-formatter';

export type TestSendAccess = {
  tests:Array<{destination?:string;channel:string;operatorId:string;operatorName:string;occurredAt:string}>;
  allowance:{day:string;limit:number;remaining:number;resetsAt:string};
  canType:boolean;
  destinations:{email:string[];sms:string[]};
};
export function TestSendHistory({tests}:{tests:TestSendAccess['tests']}) {
  const format=useDateFormatter();
  if(!tests.length)return null;
  return <section aria-label="Test send history"><h3>Recent test sends</h3><ul>{tests.map((item,index)=><li key={index}>
    {item.destination??'Destination not retained'} · {item.channel} · {format(item.occurredAt)} · {item.operatorName}
  </li>)}</ul></section>;
}
