/** Network edge controls only: no application/store state can be set here. */
export function providerBehavior() {
  let health=200,marketingDelay=0;
  const refusals=new Map<string,{status:number;retryAfter?:number;remaining:number}>();
  const requests:Array<{method:string;path:string;at:number}>=[];
  const attempts:Array<{to:string;status:number;at:number}>=[];
  return {requests,attempts,
    healthStatus:()=>health,
    delayMarketingResponses:(milliseconds:number)=>{marketingDelay=milliseconds;},
    async responseDelay(marketing:boolean){if(marketing&&marketingDelay)await new Promise(resolve=>setTimeout(resolve,marketingDelay));},
    setHealthStatus:(status:number)=>{health=status;},
    refuse:(to:string,status:number,count:number,retryAfter?:number)=>{refusals.set(to,{status,remaining:count,retryAfter});},
    nextRefusal:(to:string)=>{const refusal=refusals.get(to);if(!refusal||refusal.remaining<=0)return;refusal.remaining--;return refusal;},
  };
}
