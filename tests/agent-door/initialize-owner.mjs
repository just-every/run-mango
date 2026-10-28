/** The verifier supplies a signed claim. Use Mango's production admission. */
export default async function initialize({request,origin,email,claim,displayName,returnTo}){
 const response=await request(new URL(claim.path,origin).href,{method:'POST',redirect:'manual',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.41','Content-Type':'application/json'},body:JSON.stringify({token:claim.token,displayName,returnTo})});
 if(response.status!==303)return response;
 const cookie=response.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');
 const configured=await request(new URL('/api/settings/sender',origin).href,{method:'PUT',headers:{Origin:origin,Cookie:cookie,'CF-Connecting-IP':'192.0.2.41','Content-Type':'application/json'},body:JSON.stringify({displayName:'Orchard Studio',fromEmail:email,replyToEmail:email,physicalAddress:'1 Orchard Road, Melbourne VIC 3000'})});
 if(!configured.ok)throw new Error('Native sender setup did not complete.');
 await configured.body?.cancel();return response;
}
