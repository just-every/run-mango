// Test-only control of elapsed wall time. All production eligibility, scheduling,
// expiry and adapter code still reads Date normally; no business result is faked.
const NativeDate=globalThis.Date;
let offset=0;
let heldAt:number|undefined;
const now=()=>heldAt??NativeDate.now()+offset;
globalThis.Date=new Proxy(NativeDate,{
  construct(target,args,newTarget){return Reflect.construct(target,args.length?args:[now()],newTarget);},
  apply(){return new NativeDate(now()).toString();},
  get(target,key,receiver){return key==='now'?now:Reflect.get(target,key,receiver);},
});
export function advanceClock(advanceMs:unknown=0,hold?:unknown) {
  if(typeof advanceMs!=='number'||!Number.isSafeInteger(advanceMs)||advanceMs<0)throw new Error('Clock advance must be a non-negative integer.');
  if(hold!==undefined&&typeof hold!=='boolean')throw new Error('Clock hold must be boolean.');
  const next=now()+advanceMs;
  if(!Number.isSafeInteger(next))throw new Error('Clock advance exceeds timestamp precision.');
  const holding=hold??heldAt!==undefined;
  heldAt=holding?next:undefined;
  offset=next-NativeDate.now();
  return {now:next,offset,held:holding};
}
