import {useResource} from '@/core/app/client/lib/use-resource';
export function SendingConnectionAlert(){
  const {data}=useResource<{reason:string|null}>('/api/sending-alert');
  return data?.reason?<section className="panel" role="alert" aria-label="Sending connection"><h2>Sending connection needs attention</h2><p>{data.reason}. Approval stays blocked until the connection and signed delivery are verified.</p><a href="/app/settings#sending">Review sending connection</a></section>:null;
}
