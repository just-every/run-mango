import {test} from '@playwright/test';
import type {Installation} from './harness';

const stepTimeoutMs=90_000;

/** Deadlines use the runner's real clock, independently of the held Worker clock.
 * Observations run alongside the work: an unresponsive diagnostic endpoint must
 * never delay the deadline or replace the last successful observation. */
export function journeySteps(journey:string,getSite:()=>Installation|undefined) {
  const state:Record<string,unknown>={installation:'not started'};
  let sampling:AbortController|undefined;
  let active=0;
  async function observe(signal:AbortSignal) {
    const site=getSite();
    if(!site)return;
    const controls=[
      ['clock','/_golive/clock',{}],
      ['barrier','/_golive/barrier',{action:'status'}],
      ['delivery','/_golive/rows',{sql:'SELECT id,campaign_id,revision_id,transport_disposition,skip_reason,attempt_count,last_error_code,next_attempt_at,lease_expires_at FROM recipient_steps'}],
      ['queue','/_golive/emissions',{}],
    ] as const;
    await Promise.all(controls.map(async([name,path,body])=>{
      try {
        const response=await fetch(site.runtime.url+path,{method:'POST',headers:{'X-Test-Token':site.runtime.token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.any([signal,AbortSignal.timeout(1500)])});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const value=await response.json();
        if(signal.aborted)return;
        state[name]={observedAt:new Date().toISOString(),value};
        delete state[name+'Error'];
      } catch(error) {
        if(!signal.aborted)state[name+'Error']=String(error);
      }
    }));
  }
  async function sample(signal:AbortSignal) {
    while(!signal.aborted) {
      await observe(signal);
      await new Promise<void>(resolve=>{
        const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve();};
        const timer=setTimeout(done,5000);
        signal.addEventListener('abort',done,{once:true});
        if(signal.aborted)done();
      });
    }
  }
  return async function step<T>(name:string,caseId:string,work:()=>Promise<T>,timeoutMs=stepTimeoutMs):Promise<T> {
    const label=`${journey} / ${name} / case=${caseId}`;
    const started=performance.now();
    console.log(`JOURNEY_STEP START ${label}`);
    if(active++===0) {
      sampling=new AbortController();
      void sample(sampling.signal);
    }
    let timer:ReturnType<typeof setTimeout>|undefined;
    try {
      return await test.step(label,async()=>{
        try {
          const result=await Promise.race([Promise.resolve().then(work),new Promise<never>((_,reject)=>{
            timer=setTimeout(()=>reject(new Error(`Journey step timed out after ${timeoutMs}ms: ${label}; last observed state=${JSON.stringify(state)}`)),timeoutMs);
          })]);
          console.log(`JOURNEY_STEP FINISH ${label} durationMs=${Math.round(performance.now()-started)}`);
          return result;
        } catch(error) {
          console.error(`JOURNEY_STEP FAIL ${label} durationMs=${Math.round(performance.now()-started)} last observed state=${JSON.stringify(state)}`);
          throw new Error(`Journey step failed: ${label}; last observed state=${JSON.stringify(state)}`,{cause:error});
        }
      });
    } finally {
      clearTimeout(timer);
      if(--active===0)sampling?.abort();
    }
  };
}
