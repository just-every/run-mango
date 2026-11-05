import {createOpenAiAdapter} from '../../src/core/platform/adapters/openai';
import type {DecisionRuntime} from './runtime';

/** Only the provider transport is replaced; the production adapter owns the deadline. */
export async function unansweredGeneration(runtime:DecisionRuntime) {
  const originalFetch=globalThis.fetch;
  const originalAi=runtime.platform.ai;
  let requests=0;
  let abortName:string|undefined;
  let transportElapsedMs:number|undefined;
  globalThis.fetch=(input,init)=>{
    const url=input instanceof Request?input.url:String(input);
    if(url!=='https://api.openai.com/v1/responses')return originalFetch(input,init);
    requests++;
    const started=performance.now();
    const signal=init?.signal;
    if(!signal||signal.aborted)throw new Error('Provider transport requires a live abort signal');
    return new Promise<Response>((_resolve,reject)=>{
      signal.addEventListener('abort',()=>{
        transportElapsedMs=performance.now()-started;
        abortName=signal.reason?.name;
        reject(signal.reason);
      },{once:true});
    });
  };
  runtime.platform.ai=createOpenAiAdapter({apiKey:'synthetic-mango-1',model:'fixture-model'});
  const started=performance.now();
  try {
    const result=await runtime.call('/api/proposals/generate',{});
    return {result,elapsedMs:performance.now()-started,transportElapsedMs,requests,abortName};
  } finally {
    runtime.platform.ai=originalAi;
    globalThis.fetch=originalFetch;
  }
}
