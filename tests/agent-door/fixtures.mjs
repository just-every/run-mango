import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

/** Fresh native API clients for each policy phase, minted by the signed-in
 * owner through the same settings route as the product. Never insert native
 * application state or widen an existing credential for the harness. */
export default async function({request,origin,cookie,phase}) {
 const name='Orchard reader '+phase+' '+randomUUID();
 const response=await request(new URL('/api/settings/integrations',origin),{
  method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},
  body:JSON.stringify({name,scopes:['contacts:read','events:read']}),
 });
 assert.equal(response.status,201,'The native owner mints a fresh scoped client');
 const {token,credential}=await response.json();
 assert.equal(typeof token,'string');
 assert.equal(credential.name,name);
 assert.deepEqual([...credential.scopes].sort(),['contacts:read','events:read']);
 return {values:{},clients:{reader:{token,clientId:credential.id,
  agent:{id:'integration:'+credential.id,name,specialist:'marketer'}}}};
}
