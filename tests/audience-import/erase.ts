import {createContactErasure} from '../../src/core/features/audience/erasure/service';
/** Existing ledger/service regressions use their existing test authority edge.
 * Destructive acceptance uses the authenticated HTTP route in erasure.spec.ts. */
export async function eraseFixture(f:{db:D1Database;platform:{config:{contactHashSalt:string}}},id:string){
 const service=createContactErasure(f.db,f.platform.config.contactHashSalt);
 const context={destination:'mango',namespace:'mango-audience-v1',mappingVersion:'mango-audience-v1',storage:{database:f.db,targets:{} as any},authorization:{principalId:'test-authority',predicate:()=>({sql:'1'})}};
 let receipt=await service.begin(id,context);while(receipt?.state==='pending')receipt=await service.advance(receipt.reference,context);return receipt;
}
export async function eraseHttp(f:any,cookie:string,id:string,onResponse?:(response:Response)=>void){
 let response=await f.call(`/api/contacts/${id}`,{cookie,method:'DELETE'});if(response.status!==202&&response.status!==200)throw new Error(`Erase failed: ${response.status} ${await response.text()}`);
 onResponse?.(response);let {receipt}=await response.json();while(receipt.state==='pending'){response=await f.call(`/api/audience/erasures/${receipt.reference}/resume`,{cookie,method:'POST'});if(response.status!==202&&response.status!==200)throw new Error(`Erase resume failed: ${response.status} ${await response.text()}`);onResponse?.(response);({receipt}=await response.json());}return receipt;
}
