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
 async function json(path,method='GET',body) {
  const response=await request(new URL(path,origin),{method,headers, ...(body===undefined?{}:{body:JSON.stringify(body)})});
  assert.ok(response.ok,'Native phase fixture '+method+' '+path+' HTTP '+response.status);
  return response.json();
 }
 const extra=[];
 for(let index=0;index<2;index++) {
  const response=await request(new URL('/api/integrations/v1/contacts',origin),{method:'PUT',headers:{Origin:origin,Authorization:'Bearer '+intake.token,'Content-Type':'application/json'},body:JSON.stringify({email:'orchard-'+suffix+'-'+index+'@example.test',displayName:'Orchard phase contact',segmentName:'Orchard phase '+suffix})});
  assert.equal(response.status,200);extra.push((await response.json()).contact);
 }
 // Public signup's normal single opt-in path captures real network metadata.
 // This is the native owner's choice in a disposable installation, not agent
 // testimony about recipient permission or a direct persistence fixture.
 await json('/api/settings/opt-in/hosted','PUT',{mode:'single'});
 await json('/api/audience/signup','PUT',{frequencyDisclosure:'Monthly orchard news',embedOrigins:['https://orchard.example.test'],challengeEnabled:true});
 const description=await json('/subscribe/info');
 const protectedEmail='orchard-network-'+suffix+'@example.test';
 const capture=await request(new URL('/subscribe',origin),{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.31'},body:JSON.stringify({email:protectedEmail,displayName:'Orchard subscriber',consent:true,disclosure:description.disclosure})});
 assert.ok(capture.ok,'Native public signup');await capture.body?.cancel();
 const found=await json('/api/contacts/search?address='+encodeURIComponent(protectedEmail));
 assert.equal(found.contacts.length,1,'Public capture creates a native contact');
 const owner=(await json('/api/operator')).operator;
 return {values:{contact:{id:contact.id},merge:{id:extra[0].id},erase:{id:extra[1].id},protected:{id:found.contacts[0].id},owner:{id:owner.id},phase:{name:phase}},clients:{reader:{token:reader.token,clientId:reader.credential.id,
  agent:{id:'integration:'+reader.credential.id,name:reader.credential.name,specialist:'marketer'}}}};
}
