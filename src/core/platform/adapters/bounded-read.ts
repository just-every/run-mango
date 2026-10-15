/** One deadline covers connection, headers AND streamed body. No retries. */
export async function boundedJson(url: string, headers: HeadersInit, options: {signal?: AbortSignal; maxBytes?: number; deadlineMs?: number; transport?:typeof fetch} = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, {once:true});
  if (options.signal?.aborted) abort();
  const timeout = setTimeout(abort, options.deadlineMs ?? 5000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    // Race also bounds a transport which fails to honor cancellation while reading.
    const cancelled = new Promise<never>((_,reject) => {
      const fail=()=>reject(new Error('provider-read-deadline'));
      controller.signal.addEventListener('abort',fail,{once:true});
      if(controller.signal.aborted)fail();
    });
    return await Promise.race([cancelled, (async () => {
      const response = await (options.transport??fetch)(url, {headers, signal:controller.signal, redirect:'manual'});
      if (!response.ok) { await response.body?.cancel(); throw new Error(`provider-read-http-${response.status}`); }
      reader = response.body?.getReader();
      if (!reader) throw new Error('provider-read-empty');
      const chunks: Uint8Array[] = []; let total=0;
      while (true) {
        const {done,value} = await reader.read(); if (done) break;
        total += value.byteLength;
        if (total > (options.maxBytes ?? 32768)) {controller.abort(); throw new Error('provider-read-too-large');}
        chunks.push(value);
      }
      const bytes = new Uint8Array(total); let offset=0;
      for (const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.byteLength;}
      return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as unknown;
    })()]);
  } finally {
    clearTimeout(timeout); options.signal?.removeEventListener('abort',abort);
    if (controller.signal.aborted) void reader?.cancel().catch(()=>{});
  }
}
