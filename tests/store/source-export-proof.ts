import {expect} from '@playwright/test';
import {readArchive} from '../../src/vendor/base/portability/index.mjs';
type Call=(path:string,init?:{method?:string;body?:unknown;cookie?:string})=>Promise<Response>;
/** Read actual persisted commerce facts through the existing owner export door. */
export async function exportedStoreRecords(call:Call,cookie:string){
 const began=Date.now(),started=await call('/api/portability/exports',{method:'POST',cookie,body:{}});expect(started.status).toBe(201);const {id}=await started.json();
 let status;
 // The existing public API accepts bounded batches; read every resulting part.
 do {const response=await call(`/api/portability/exports/${id}/advance`,{method:'POST',cookie,body:{maxParts:32}});expect(response.status).toBe(200);status=await response.json();}while(status.phase!=='complete');
 const response=await call(`/api/portability/exports/${id}/download`,{cookie});expect(response.status).toBe(200);
 const rows:Array<{table:string;row:Record<string,any>}>=[];
 for await(const record of readArchive(response.body!))if(record.kind==='part')for(const item of record.items)if(item.kind==='row')rows.push(item);
 console.log(`Source export read elapsed=${Date.now()-began}ms`);
 return {sources:rows.filter(item=>item.table==='source_records').map(item=>item.row),contacts:rows.filter(item=>item.table==='contacts').map(item=>item.row)};
}
export function assertSourceFacts(rows:Array<Record<string,any>>,provider:string,expected:Array<{type:string;id:string;at:string}>,declared:string[]){
 expect(new Set(expected.map(row=>row.type))).toEqual(new Set(declared));
 for(const row of expected)expect(rows).toContainEqual(expect.objectContaining({provider,source_type:row.type,provider_source_id:row.id,occurred_at:Date.parse(row.at)}));
}
