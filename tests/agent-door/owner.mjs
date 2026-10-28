/** Production signed claim and native sender setup in the disposable verifier. */
export default async function({request,origin,claim,displayName,returnTo,email}){
 const claimed=await request(new URL(claim.path,origin),{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:claim.token,displayName,returnTo})});
 if(claimed.status!==303)return claimed;
 const cookie=claimed.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');
 const headers={Origin:origin,Cookie:cookie,'Content-Type':'application/json'};
 const operator=await request(new URL('/api/operator',origin),{headers});if(!operator.ok)throw Error('Native owner projection failed.');
 const sender=await request(new URL('/api/settings/sender',origin),{method:'PUT',headers,body:JSON.stringify({displayName:'Orchard newsletter',fromEmail:email,replyToEmail:email,physicalAddress:'24 Orchard Lane, Test City'})});
 if(!sender.ok)throw Error('Native sender setup failed.');
 return claimed;
}
