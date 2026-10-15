import type {QueueCommand} from '../../src/core/shared/platform';

// Test-only scheduling barriers around real D1 calls. They never supply query
// results or alter SQL: after release the original statement/transaction runs.
type Point='step-start'|'approval'|'handoff'|'click-index'|'outage-pause'|'sms-frequency';
const patterns:Record<Point,RegExp>={
  'step-start':/^\s*INSERT INTO step_dispatches\b/,
  'sms-frequency':/^\s*INSERT INTO sms_frequency_claims\b/,
  'outage-pause':/^\s*(?:INSERT INTO provider_outages\b|UPDATE provider_outages SET state=CASE WHEN)/,
  'click-index':/^\s*INSERT INTO link_click_facts\b/,
  approval:/^\s*INSERT INTO campaign_approval_requests\b/,
  handoff:/^\s*UPDATE recipient_steps SET transport_disposition = 'handoff-unknown'/,
};
let barrier:{point:Point;identity:string;waiting:boolean}|undefined;
const statements=new WeakMap<object,{raw:D1PreparedStatement;sql:string;values:unknown[]}>();
export function arm(point:Point,identity:string) {
  if(!Object.hasOwn(patterns,point)||barrier)throw new Error('Invalid or already armed barrier.');
  barrier={point,identity,waiting:false};
}
export function release() {barrier=undefined;}
export function status() {return barrier?{point:barrier.point,waiting:barrier.waiting}:null;}
async function before(queries:Array<{sql:string;values:unknown[]}>) {
  const current=barrier;
  if(!current||current.waiting||!queries.some(q=>patterns[current.point].test(q.sql)&&q.values.includes(current.identity)))return;
  current.waiting=true;
  // Each timer belongs to the active D1 request. A bare promise resolved by a
  // different request can be canceled by Workers as hung; request-owned native
  // timer waits keep the real operation alive until the control releases it.
  while(barrier===current)await new Promise<void>(resolve=>setTimeout(resolve,10));
}
export function controlledDatabase(database:D1Database):D1Database {
  const wrap=(raw:D1PreparedStatement,sql:string,values:unknown[]=[]):D1PreparedStatement=>{
    const proxy=new Proxy(raw,{get(target,key){
      if(key==='bind')return (...bound:unknown[])=>wrap(target.bind(...bound),sql,bound);
      const value=Reflect.get(target,key,target);
      if(typeof value!=='function')return value;
      return async(...args:unknown[])=>{await before([{sql,values}]);return value.apply(target,args);};
    }});
    statements.set(proxy,{raw,sql,values});return proxy;
  };
  return new Proxy(database,{get(target,key){
    if(key==='prepare')return (sql:string)=>wrap(target.prepare(sql),sql);
    if(key==='batch')return async(items:D1PreparedStatement[])=>{
      const records=items.map(item=>statements.get(item));
      await before(records.filter((r):r is NonNullable<typeof r>=>Boolean(r)));
      return target.batch(items.map((item,i)=>records[i]?.raw??item));
    };
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
}
const emissions:Array<{command:QueueCommand;delaySeconds:number}>=[];
export function capturedEmissions(){return emissions;}
export function controlledQueue(queue:Queue<QueueCommand>):Queue<QueueCommand> {
  return new Proxy(queue,{get(target,key){
    if(key==='send')return async(command:QueueCommand,options?:QueueSendOptions)=>{
      emissions.push({command:structuredClone(command),delaySeconds:options?.delaySeconds??0});
      return target.send(command,options);
    };
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
}
export async function replay(queue:Queue<QueueCommand>,index:number) {
  const emission=emissions[index];if(!emission)throw new Error('No actual emission at this index.');
  await queue.send(emission.command);
}
