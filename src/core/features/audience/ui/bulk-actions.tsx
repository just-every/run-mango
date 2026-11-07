import {useState} from 'react';
import {requestJson} from '@/core/app/client/lib/api';
import {Modal} from '@/core/app/client/ui/modal';
import {usePermissions} from '@/core/features/auth/ui/permissions';
import type {Capability} from '@/core/features/auth/permissions';
import {actionLabels,type BulkAction,type BulkReceipt} from './bulk-types';

const needs:Record<BulkAction,Capability>={tag:'segment.manage',untag:'segment.manage',export:'audience.export',suppress:'contact.optout',erase:'contact.erase','add-to-topic':'contact.subscribe'};
const careful:BulkAction[]=['suppress','erase'];

/** The bulk bar for one selection: a list of contact ids, or every match of the current search. */
export function BulkActions({count,selection,onStarted}:{count:number;selection:unknown;onStarted:(receipt:BulkReceipt)=>void}) {
  const {can}=usePermissions();
  const [action,setAction]=useState<BulkAction>(),[value,setValue]=useState(''),[channel,setChannel]=useState('email'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  if(!can('segment.manage'))return null;
  async function run() {
    if(!action)return;setBusy(true);setError('');
    const params=action==='tag'||action==='untag'?{tag:value}:action==='add-to-topic'?{topic:value,channel}:{};
    try{
      const result=await requestJson<{receipt:BulkReceipt;detail?:string}>('/api/audience/bulk',{method:'POST',body:JSON.stringify({action,params,selection,confirmTotal:count})});
      if(result.status>=400){setError(result.data.detail??'The action could not start. Check the names and try again.');return;}
      setAction(undefined);setValue('');onStarted(result.data.receipt);
    }catch{setError('The action could not start. Try again.');}finally{setBusy(false);}
  }
  const named=action==='tag'||action==='untag'||action==='add-to-topic';
  const noun=count===1?'contact':'contacts';
  return <div className="bulk-actions" role="group" aria-label={`Actions for ${count} selected ${noun}`}>
    <strong>{count.toLocaleString('en-US')} selected</strong>
    {(Object.keys(actionLabels) as BulkAction[]).filter(name=>can(needs[name])).map(name=>
      <button key={name} type="button" className={name==='erase'?'danger-action--line':'secondary-action'} onClick={()=>{setAction(name);setError('');setValue('');}}>{actionLabels[name]}</button>)}
    <Modal open={Boolean(action)} role={action&&careful.includes(action)?'alertdialog':'dialog'} title={action?`${actionLabels[action]} · ${count.toLocaleString('en-US')} ${noun}`:''}
      description={action==='erase'?'Erasure removes each contact’s data and keeps only the opt-out record that must survive. It cannot be undone.':action==='suppress'?'Suppression blocks every address and number of these contacts until it is lifted by an owner.':action==='add-to-topic'?'Only contacts with confirmed consent for this topic are added. Every other contact is listed with the reason.':action==='export'?'Prepare a CSV of the selected contacts.':'Applies to every selected contact.'}
      onClose={()=>{if(!busy)setAction(undefined);}}>
      {named?<label>{action==='add-to-topic'?'Topic':'Tag'}<input value={value} onChange={event=>setValue(event.target.value)} maxLength={160} autoComplete="off"/></label>:null}
      {action==='add-to-topic'?<label>Channel<select value={channel} onChange={event=>setChannel(event.target.value)}><option value="email">Email</option><option value="sms">SMS</option></select></label>:null}
      {error?<p className="inline-error" role="alert">{error}</p>:null}
      <button type="button" className={action==='erase'?'danger-action':'primary-action'} disabled={busy||(named&&!value.trim())} onClick={()=>void run()}>
        {action?`${actionLabels[action]} ${count.toLocaleString('en-US')} ${noun}`:''}</button>
      <button type="button" className="secondary-action" disabled={busy} onClick={()=>setAction(undefined)}>Cancel</button>
    </Modal>
  </div>;
}
