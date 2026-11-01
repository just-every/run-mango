import {useResource} from '@/core/app/client/lib/use-resource';
export function SendingConnectionAlert(){
  const {data}=useResource<{reason:string|null}>('/api/sending-alert');
  return data?.reason?<section className="inline-error desk-attention__line" role="alert" aria-label="Sending connection"><div className="desk-attention__row"><span>Sending connection needs attention: {data.reason}.</span><span className="desk-attention__actions"><a className="text-link" href="/app/settings#sending" aria-label="Review sending connection">Review</a></span></div></section>:null;
}
