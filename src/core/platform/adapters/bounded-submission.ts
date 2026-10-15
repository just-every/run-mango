/** A single bounded provider submission. Failure never asserts nonacceptance. */
export async function boundedSubmission(url:string,init:RequestInit):Promise<Response> {
  const controller=new AbortController();
  let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const expired=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Provider handoff deadline; acceptance is unknown.'));},15000);});
  try {
    return await Promise.race([expired,(async()=>{
      const response=await fetch(url,{...init,signal:controller.signal,redirect:'manual'});
      // Ambiguous status does not require a body and must never become retry-safe.
      if((response.status>=300&&response.status<400)||response.status>=500||[408,409,425].includes(response.status)) {void response.body?.cancel();throw new Error('Provider handoff outcome is unknown.');}
      reader=response.body?.getReader();if(!reader)return response;
      const chunks:Uint8Array[]=[];let length=0;
      while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>32768){controller.abort();throw new Error('Provider response exceeds acceptance evidence limit.');}chunks.push(value);}
      const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
      return new Response(bytes,{status:response.status,headers:response.headers});
    })()]);
  }catch {throw new Error('Provider handoff outcome is unknown.');}
  finally{clearTimeout(timer);if(controller.signal.aborted)void reader?.cancel().catch(()=>{});}
}
