import assert from 'node:assert/strict';
import {test} from 'node:test';
import {remoteD1} from '../scripts/remote-d1.mjs';
const accountId='a'.repeat(32),databaseId='11111111-2222-4333-8444-555555555555';
const result=values=>({success:true,result:values.map(results=>({success:true,results,meta:{changes:0}}))});

test('D1 REST adapter sends the documented batch object and preserves bound values',async()=>{
 const calls=[];const DB=remoteD1({accountId,databaseId,token:'fixture-only',fetch:async(url,init)=>{
  calls.push({url,...init,body:JSON.parse(init.body)});return Response.json(result([[{value:'returned'}]]));
 }});
 assert.equal(await DB.prepare('SELECT ? AS value').bind("literal'; ?").first('value'),'returned');
 assert.equal(calls.length,1);assert.equal(calls[0].url,`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`);
 assert.equal(calls[0].method,'POST');assert.deepEqual(calls[0].body,{batch:[{sql:'SELECT ? AS value',params:["literal'; ?"]}]});
 assert.equal(calls[0].headers.Authorization,'Bearer fixture-only');
});

test('D1 REST batch remains one provider operation with ordered statements and results',async()=>{
 let count=0;const DB=remoteD1({accountId,databaseId,token:'fixture-only',fetch:async(_url,init)=>{
  count++;assert.deepEqual(JSON.parse(init.body),{batch:[{sql:'INSERT INTO items VALUES (?)',params:['first']},{sql:'SELECT * FROM items',params:[]}]});
  return Response.json(result([[],[{value:'first'}]]));
 }});
 const rows=await DB.batch([DB.prepare('INSERT INTO items VALUES (?)').bind('first'),DB.prepare('SELECT * FROM items')]);
 assert.equal(count,1);assert.deepEqual(rows[1].results,[{value:'first'}]);
});

test('D1 REST errors and partial batch results fail without retry or provider detail disclosure',async()=>{
 for(const [status,data] of [[400,{success:false,errors:[{message:'private SQL diagnostic'}]}],[200,{success:true,result:[]}],[200,{success:true,result:[{success:false,results:[]}]}],[200,{success:true,result:[{success:true,results:{}}]}]]){
  let count=0;const DB=remoteD1({accountId,databaseId,token:'fixture-only',fetch:async()=>{count++;return Response.json(data,{status});}});
  await assert.rejects(DB.prepare('SELECT private_column').all(),error=>error.message===`Remote D1 query failed (HTTP ${status}).`);assert.equal(count,1);
 }
});

test('D1 REST first returns null for absent rows and transport failures are never retried',async()=>{
 const DB=remoteD1({accountId,databaseId,token:'fixture-only',fetch:async()=>Response.json(result([[]]))});assert.equal(await DB.prepare('SELECT 1 WHERE false').first(),null);
 let count=0;const failed=remoteD1({accountId,databaseId,token:'fixture-only',fetch:async()=>{count++;throw new Error('connection reset');}});
 await assert.rejects(failed.prepare('SELECT 1').run(),/connection reset/);assert.equal(count,1);
});
