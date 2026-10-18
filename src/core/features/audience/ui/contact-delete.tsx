import type {ComponentProps} from 'react';
import {Can} from '@/core/features/auth/ui/permissions';
import {useEffect,useRef,useState} from 'react';
import {Link} from '@tanstack/react-router';
import {requestJson} from '@/core/app/client/lib/api';
import {Modal} from '@/core/app/client/ui/modal';
import type {ErasureReceipt} from '../erasure/types';
import {receiptCounts} from './receipt-counts';
function ContactDeleteContent({id,onReceipt}:{id:string;onReceipt:(receipt:ErasureReceipt)=>void}){
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function remove(){
    setBusy(true);setError('');
    try{const result=await requestJson<{receipt:ErasureReceipt;detail?:string}>(`/api/contacts/${id}`,{method:'DELETE'});if(result.status>=400)throw new Error(result.data.detail??'Deletion could not start.');setOpen(false);window.history.replaceState(null,'',`/app/audience/deleted?erasure=${result.data.receipt.reference}`);onReceipt(result.data.receipt);}
    catch(error){setError(error instanceof Error?error.message:'Deletion could not start.');}finally{setBusy(false);}
  }
  return <><button type="button" className="danger-action--line" onClick={()=>setOpen(true)}>Delete contact</button><Modal open={open} onClose={()=>{if(!busy)setOpen(false);}} title="Delete contact" description="Remove this contact’s addresses, consent evidence, history, source records, delivery details and retained import copies. Affected import files and their undo history are withdrawn. Saved rules containing this contact’s details are redacted and affected campaigns need review."><p>If an address has opted out, one secret-keyed hash per channel identity survives to prevent renewed contact. No readable address remains in the completion receipt. Operator login records remain separate.</p>{error?<p className="inline-error" role="alert">{error}</p>:null}<div className="edit-actions"><button type="button" className="secondary-action" disabled={busy} onClick={()=>setOpen(false)}>Cancel</button><button type="button" className="danger-action" disabled={busy} onClick={()=>void remove()}>{busy?'Starting deletion…':'Delete contact permanently'}</button></div></Modal></>;
}
export function ContactErasureReceipt({initial}:{initial:ErasureReceipt}){
  const [receipt,setReceipt]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const running=useRef(false);
  async function resume(){
    if(running.current)return;running.current=true;
    setBusy(true);setError('');let current=receipt;
    try{while(current.state==='pending'){const result=await requestJson<{receipt:ErasureReceipt}>(`/api/audience/erasures/${current.reference}/resume`,{method:'POST'});if(result.status>=400)throw new Error('Deletion is still pending. Resume to continue safely.');current=result.data.receipt;setReceipt(current);}}
    catch(error){setError(error instanceof Error?error.message:'Deletion is still pending.');}finally{running.current=false;setBusy(false);}
  }
  useEffect(()=>{void resume();},[]);
  return <div className="page-flow"><header className="page-head"><div><p className="eyebrow">Erasure receipt</p><h1>{receipt.state==='complete'?'Contact deleted':'Deletion in progress'}</h1><p>{receipt.state==='complete'?`Completed ${new Date(receipt.completedAt!).toLocaleString()}`:'Continue until every retained copy has been removed. You can safely resume an interrupted deletion.'}</p></div></header><section className="panel audience-ledger"><p>Reference: {receipt.reference}</p><p>Retained opt-out channels: {receipt.retainedChannels.length?receipt.retainedChannels.join(', '):'None'}</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Erasure counts"><table className="responsive-table audience-ledger__table"><thead><tr><th scope="col">Record kind</th><th scope="col">Removed or anonymised</th></tr></thead><tbody>{receiptCounts(receipt.removed).map(([kind,count])=><tr key={kind}><th scope="row">{kind}</th><td data-label="Removed or anonymised">{count}</td></tr>)}</tbody></table></div>{error&&receipt.state==='pending'?<p className="inline-error" role="alert">{error}</p>:null}{receipt.state==='pending'?<button type="button" className="primary-action" disabled={busy} onClick={()=>void resume()}>{busy?'Removing retained copies…':'Continue deletion'}</button>:<Link className="secondary-action" to="/app/audience">Back to audience</Link>}</section></div>;
}

export function ContactDelete(props:ComponentProps<typeof ContactDeleteContent>) {return <Can permission="contact.erase"><ContactDeleteContent {...props}/></Can>;}
