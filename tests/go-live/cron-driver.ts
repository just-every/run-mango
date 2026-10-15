import {readFile} from 'node:fs/promises';
import type {Installation} from './harness';

/** Vite/workerd does not initiate Cron Triggers. This independent wall-clock
 * driver reads the actual deployment declaration; it knows no campaign or due
 * time and invokes the real scheduled export through the protected fixture door.
 * It proves local scheduling/Queue/D1 behavior, not Cloudflare activation/latency. */
export async function configuredCronDriver(site:Installation) {
  const {crons}=JSON.parse(await readFile('deploy.json','utf8')) as {crons:string[]};
  const fields=crons.map(cron=>cron.split(/\s+/));
  const matches=(field:string,value:number)=>field.split(',').some(part=>{
    if(part==='*')return true;
    if(/^\*\/\d+$/.test(part))return value%Number(part.slice(2))===0;
    if(/^\d+$/.test(part))return Number(part)===value;
    throw new Error(`Unsupported cron field in local proof driver: ${field}`);
  });
  for(const parts of fields) {if(parts.length!==5)throw new Error('Invalid cron declaration');parts.forEach(field=>matches(field,0));}
  let timer:ReturnType<typeof setTimeout>,stopped=false,pending=Promise.resolve(),failure:unknown;
  const ticks:Array<{scheduledAt:string;enteredAt:string;finishedAt?:string}>=[];
  function arm() {
    const slot=(Math.floor(Date.now()/60000)+1)*60000;
    timer=setTimeout(()=>{
      if(stopped)return;
      arm();
      const date=new Date(slot),values=[date.getUTCMinutes(),date.getUTCHours(),date.getUTCDate(),date.getUTCMonth()+1,date.getUTCDay()];
      if(!fields.some(parts=>parts.every((field,index)=>matches(field,values[index]))))return;
      const tick={scheduledAt:date.toISOString(),enteredAt:new Date().toISOString(),finishedAt:undefined as string|undefined};ticks.push(tick);
      pending=pending.then(async()=>{await site.control('/_golive/cron',{scheduledTime:slot});tick.finishedAt=new Date().toISOString();}).catch(error=>{failure=error;});
    },Math.max(0,slot-Date.now()));
  }
  arm();
  return {ticks,async close(){stopped=true;clearTimeout(timer);await pending;if(failure)throw failure;}};
}
