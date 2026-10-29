import assert from 'node:assert/strict';

/** A separate person's ordinary invitation, email proof and native session. */
export default async function({request,origin,email,owner,mail}){
 const invited=await request(new URL('/api/operators',origin),{method:'POST',headers:{Origin:origin,Cookie:owner.cookie,'Content-Type':'application/json'},body:JSON.stringify({email})});
 assert.equal(invited.status,201,'Native reviewer invitation');
 const messages=mail.read();
 const link=messages.flatMap(message=>message.text.match(/https:\/\/[^\s<>]+/g)??[]).map(value=>new URL(value)).find(url=>url.origin===origin&&url.pathname==='/auth/confirm');
 assert.ok(link,'Accepted invitation mail contains the native confirmation link');
 const token=link.searchParams.get('token');assert.ok(token);
 const confirmed=await request(new URL('/auth/confirm',origin),{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token})});
 assert.equal(confirmed.status,303,'Native reviewer confirms their own invitation');
 const cookie=confirmed.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');
 assert.ok(cookie&&cookie!==owner.cookie,'Reviewer has an independent native session');
 const person=await request(new URL('/api/operator',origin),{headers:{Cookie:cookie}});
 assert.equal(person.status,200);assert.equal((await person.json()).operator.email,email);
 return confirmed;
}
