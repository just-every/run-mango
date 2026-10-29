import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

/** Fresh native intake and scoped API clients for each conformance phase.
 * Only public production doors prepare data; no database rows or authority are
 * fabricated. Source intake retains its separate contacts:write credential.
 */
export default async function({request,origin,cookie,phase}) {
 const headers={Origin:origin,Cookie:cookie,'Content-Type':'application/json'};
 async function credential(name,scopes) {
  const response=await request(new URL('/api/settings/integrations',origin),{
   method:'POST',headers,body:JSON.stringify({name,scopes}),
  });
  assert.equal(response.status,201,'Native phase credential creation');
  return response.json();
 }
 const suffix=randomUUID();
 const intake=await credential('Orchard intake '+suffix,['contacts:write']);
 const reader=await credential('Orchard reader '+suffix,['contacts:read','events:read']);
 const imported=await request(new URL('/api/integrations/v1/contacts',origin),{
  method:'PUT',headers:{Origin:origin,Authorization:'Bearer '+intake.token,'Content-Type':'application/json'},
  body:JSON.stringify({email:'orchard-'+suffix+'@example.test',displayName:'Orchard reader',segmentName:'Orchard phase '+suffix}),
 });
 assert.equal(imported.status,200,'Native source intake creates the phase contact');
 const {contact}=await imported.json();
 assert.equal(contact.emailStatus,'non-subscribed','Source intake never invents recipient permission');
 return {values:{contact:{id:contact.id},phase:{name:phase}},clients:{reader:{token:reader.token,clientId:reader.credential.id,
  agent:{id:'integration:'+reader.credential.id,name:reader.credential.name,specialist:'marketer'}}}};
}
