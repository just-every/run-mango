// Test-only SendGrid domain/DNS edge. Native sender observations remain in Mango.
const key="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA00g1RVukt3Gf4NFnH+Wb3vuWm8gmb+U7Iaq+5XnWc/qKrDa2glZ6HMQ7f/Mtv5tdABZNyuxEudnozg4ULa+hu/PArpbC+h1kvYO8LPKiHcyNMn2BJz6yBE9wL5UCQlfeWa3YgqlDI1ypu/oDZxEcc9SzGxcitWBKcQRa7adFwW8sV1RtQ0h+LxXr7zZqy2chCkhaI+Dbr6lfR1xq2ldHWFgrP8kDD66ZWFRamkXFBRaTvWU70C9FgHpJvVK4z8TBAnYAGcgr4Mv37KKpEi5pr3j4U59chrJPMlmgt0oz4DY4KO9qeQV8PlAzgG/MZlusiJ6C4034qBDMMD+/Jx1V1wIDAQAB",domain='example.test';
const zone={
 ['em123.'+domain]:[{type:5,data:'u99.wl.sendgrid.net.'}],
 'u99.wl.sendgrid.net':[{type:16,data:'"v=spf1 ip4:192.0.2.1 -all"'}],
 ['s1._domainkey.'+domain]:[{type:5,data:'s1.domainkey.u99.wl.sendgrid.net.'}],
 ['s2._domainkey.'+domain]:[{type:5,data:'s2.domainkey.u99.wl.sendgrid.net.'}],
 's1.domainkey.u99.wl.sendgrid.net':[{type:16,data:'"v=DKIM1; k=rsa; p='+key+'"'}],
 's2.domainkey.u99.wl.sendgrid.net':[{type:16,data:'"v=DKIM1; k=rsa; p='+key+'"'}],
 ['_dmarc.'+domain]:[{type:16,data:'"v=DMARC1; p=quarantine; psd=n"'}],
};
export default {async fetch(request){
 const url=new URL(request.url);
 if(url.hostname==='api.sendgrid.com'&&url.pathname==='/v3/whitelabel/domains')return Response.json([{id:77,user_id:77,domain,valid:true,automatic_security:true,custom_spf:false,dns:{mail_cname:{valid:true,type:'cname',host:'em123.'+domain,data:'u99.wl.sendgrid.net'},dkim1:{valid:true,type:'cname',host:'s1._domainkey.'+domain,data:'s1.domainkey.u99.wl.sendgrid.net'},dkim2:{valid:true,type:'cname',host:'s2._domainkey.'+domain,data:'s2.domainkey.u99.wl.sendgrid.net'}}}]);
 if(url.hostname==='cloudflare-dns.com'){
  const type=({TXT:16,CNAME:5,A:1,AAAA:28,MX:15})[url.searchParams.get('type')],answers=[];let name=url.searchParams.get('name').toLowerCase().replace(/\.$/,'');
  for(let hop=0;hop<8;hop++){
   const rows=zone[name]??[],alias=rows.find(row=>row.type===5);
   if(alias){answers.push({name,TTL:300,...alias});if(type===5)break;name=alias.data.replace(/\.$/,'');continue;}
   answers.push(...rows.filter(row=>row.type===type).map(row=>({name,TTL:300,...row})));break;
  }
  return Response.json(answers.length?{Status:0,Answer:answers}:{Status:3,Authority:[{name:domain,type:6,TTL:300,data:'ns.example.test host.example.test 1 300 300 300 300'}]});
 }
 return new Response(null,{status:502});
}};
