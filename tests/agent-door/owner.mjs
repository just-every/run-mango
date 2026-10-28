/** Production signed claim and native sender setup in the disposable verifier. */
export default async function({request,origin,claim,displayName,returnTo,email,reviewers,mail,database}){
 const claimed=await request(new URL(claim.path,origin),{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:claim.token,displayName,returnTo})});
 if(claimed.status!==303)return claimed;
 // Privileged invitations require the owner's ordinary fresh email proof,
 // independently of the installation's signed first-owner claim.
 const signin=await request(new URL('/auth/magic-link',origin),{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,returnTo})});
 if(signin.status!==202)throw Error('Native owner email sign-in failed.');
 const link=mail.read().flatMap(message=>message.text.match(/https:\/\/[^\s<>]+/g)??[]).map(value=>new URL(value)).findLast(url=>url.origin===origin&&url.pathname==='/auth/confirm');
 const token=link?.searchParams.get('token');if(!token)throw Error('Native owner confirmation mail unavailable.');
 const confirmed=await request(new URL('/auth/confirm',origin),{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token})});
 if(confirmed.status!==303)throw Error('Native owner email confirmation failed.');
 await claimed.body?.cancel();
 const cookie=confirmed.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');
 const headers={Origin:origin,Cookie:cookie,'Content-Type':'application/json'};
 const operator=await request(new URL('/api/operator',origin),{headers});if(!operator.ok)throw Error('Native owner projection failed.');
 const sender=await request(new URL('/api/settings/sender',origin),{method:'PUT',headers,body:JSON.stringify({displayName:'Orchard newsletter',fromEmail:email,replyToEmail:email,physicalAddress:'24 Orchard Lane, Test City'})});
 if(!sender.ok)throw Error('Native sender setup failed.');
 // Authentication mail shares Mango's real transport spacing. Read the
 // disposable queue's admission time before requesting the next email.
 const db=await database('DB');
 const pacing=await db.prepare('SELECT MAX(next_at) nextAt FROM provider_pacing').first();
 if(pacing?.nextAt>Date.now())await new Promise(resolve=>setTimeout(resolve,pacing.nextAt-Date.now()));
 await reviewers.initialize('quality',{cookie});
 return confirmed;
}
