import {useState} from 'react';
import {requestJson} from '@/core/app/client/lib/api';
import {useResource} from '@/core/app/client/lib/use-resource';

type Estimates={enabled:boolean;estimatedRecipients:number;label:string;note:string};
export function OpenEstimates({onSettingsChanged}:{onSettingsChanged?:()=>void}={}) {
  const {data,loading,error,reload}=useResource<Estimates>('/api/insights/open-tracking');
  const [pending,setPending]=useState<boolean>();
  const [busy,setBusy]=useState(false),[failure,setFailure]=useState('');
  async function change(enabled:boolean) {
    setPending(enabled);setBusy(true);setFailure('');
    try {
      const response=await requestJson<{detail?:string}>('/api/insights/open-tracking',{method:'PUT',body:JSON.stringify({enabled})});
      if(response.status!==200)throw new Error(response.data.detail??'The open tracking setting could not be saved.');
      onSettingsChanged?.();
      await reload();
    } catch(error) {setFailure(error instanceof Error?error.message:'The open tracking setting could not be saved.');} finally {setBusy(false);setPending(undefined);}
  }
  return <section className="panel" aria-labelledby="open-estimates-title">
    <h2 id="open-estimates-title">Privacy-sensitive open estimates</h2>
    <p>Off by default. Enabling adds a recipient-specific image to future marketing emails. Disabling stops recording from all existing images; re-enabling only tracks newly prepared messages.</p>
    {data?<><label><input type="checkbox" checked={pending??data.enabled} disabled={busy} onChange={event=>void change(event.target.checked)}/> Enable privacy-sensitive open estimates</label>
      <p>{data.estimatedRecipients} recipient estimates kept.</p><p>{data.note}</p></>:<p>{loading?'Loading open tracking setting…':error}</p>}
    {failure?<p role="alert">{failure}</p>:null}
  </section>;
}
