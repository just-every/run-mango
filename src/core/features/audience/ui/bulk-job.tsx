import {useEffect,useRef,useState} from 'react';
import {requestJson} from '@/core/app/client/lib/api';
import {actionLabels,reasonCopy,type BulkReceipt} from './bulk-types';

const summary=(receipt:BulkReceipt)=>{
  const detail=receipt.params.tag?` “${receipt.params.tag}”`:receipt.params.topic?` “${receipt.params.topic}”`:'';
  return `${actionLabels[receipt.action]}${detail}`;
};

/** Drives one durable job to its end and keeps its receipt on screen: progress, every refused contact, and the file for an export. */
export function BulkJob({initial,onFinished}:{initial:BulkReceipt;onFinished:()=>void}) {
  const [receipt,setReceipt]=useState(initial),[error,setError]=useState(''),[more,setMore]=useState<BulkReceipt['refusedContacts']>([]),[next,setNext]=useState(initial.refusedNext);
  const running=useRef(false);
  async function drive(start:BulkReceipt) {
    if(running.current)return;running.current=true;setError('');let current=start;
    try{
      while(current.state==='running'||current.state==='failed'){
        const result=await requestJson<{receipt:BulkReceipt;waiting?:boolean;detail?:string}>(`/api/audience/bulk/${current.id}/resume`,{method:'POST'});
        if(result.status>=400)throw new Error(result.data.detail??'The action is still running. Resume to continue safely.');
        current=result.data.receipt;setReceipt(current);setNext(current.refusedNext);
        if(current.state==='failed')throw new Error(current.error??'The action stopped.');
        if(result.data.waiting)await new Promise(resolve=>setTimeout(resolve,2000));
      }
      onFinished();
    }catch(failure){setError(failure instanceof Error?failure.message:'The action stopped.');}
    finally{running.current=false;}
  }
  useEffect(()=>{void drive(initial);},[]);
  async function showMore() {
    const result=await requestJson<{receipt:BulkReceipt}>(`/api/audience/bulk/${receipt.id}?refusedAfter=${next}&refusedLimit=200`);
    if(result.status<400){setMore(rows=>[...rows,...result.data.receipt.refusedContacts]);setNext(result.data.receipt.refusedNext);}
  }
  async function download() {
    const response=await fetch(`/api/audience/bulk/${receipt.id}/export`,{credentials:'same-origin'});
    if(!response.ok){setError('The CSV could not be downloaded. Try again.');return;}
    const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');
    link.href=url;link.download=`contacts-${receipt.id}.csv`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  }
  const percent=receipt.total?Math.floor(receipt.processed/receipt.total*100):0,rows=[...receipt.refusedContacts,...more];
  return <section className="panel bulk-job" aria-label="Bulk action receipt">
    <div className="section-heading"><div><p className="eyebrow">{receipt.state==='complete'?'Receipt':'In progress'}</p><h3>{summary(receipt)}</h3></div></div>
    <div className="bulk-job__bar" role="progressbar" aria-label="Bulk action progress" aria-valuemin={0} aria-valuemax={receipt.total} aria-valuenow={receipt.processed}><span style={{width:`${percent}%`}}/></div>
    <p role="status">{receipt.processed.toLocaleString('en-US')} of {receipt.total.toLocaleString('en-US')} contacts handled · {receipt.succeeded.toLocaleString('en-US')} done · {receipt.refused.toLocaleString('en-US')} refused{receipt.state==='complete'?' · finished':''}</p>
    {error?<p className="inline-error" role="alert">{error} <button type="button" className="secondary-action" onClick={()=>void drive(receipt)}>Resume</button></p>:null}
    {receipt.action==='export'&&receipt.state==='complete'?<button type="button" className="secondary-action" onClick={()=>void download()}>Download CSV</button>:null}
    {rows.length?<div className="table-scroll" tabIndex={0} role="region" aria-label="Refused contacts"><table className="responsive-table"><caption>Refused contacts</caption><thead><tr><th scope="col">Contact</th><th scope="col">Why</th></tr></thead><tbody>
      {rows.map(row=><tr key={row.contactId}><th scope="row">{row.name}<small>{row.email}</small></th><td data-label="Why">{reasonCopy[row.reason]??row.reason}</td></tr>)}
    </tbody></table></div>:null}
    {next!==null?<button type="button" className="secondary-action" onClick={()=>void showMore()}>Show more refused contacts</button>:null}
  </section>;
}
