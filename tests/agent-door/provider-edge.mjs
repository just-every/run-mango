import {layerDoc,image} from './design-fixture.mjs';

// Only provider protocols run here. The isolated verifier gives this Worker no
// app database, filesystem, credentials, native services or outbound network.
const runs=new Map(),layouts=new Map(),replies=new Map();
const bytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const publicKey='MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC053m3QEgV8UfCdhRky4NbKGcawjzjPDBqVCIkyZbWXL9sQ2ixAXrY2oE9r2SMgJKO0Ufb/QLytki0DLLAYh9MMV0Szk5iUD3+HcXjhc1j4iVC0BxTUdkw1twwjFI3Za+driJ95wFGGBBh0+MnS6npHc+NDCep+g2pnl0GHJ01DwIDAQAB';
const records=[{record:'SPF',name:'send',type:'TXT',value:'v=spf1 include:amazonses.com ~all',status:'verified'},
 {record:'SPF',name:'send',type:'MX',value:'feedback.example.test',priority:10,status:'verified'},
 {record:'DKIM',name:'selector._domainkey',type:'TXT',value:'v=DKIM1; k=rsa; p='+publicKey,status:'verified'}];
const domain={id:'domain-1',name:'example.test',status:'verified',region:'us-east-1',capabilities:{sending:'enabled'}};
export default {async fetch(request,{fixture}={}){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(fixture?.outage)return new Response('Provider unavailable',{status:503});
 if(url.hostname==='cloudflare-dns.com'){
  const name=url.searchParams.get('name'),type=url.searchParams.get('type');
  const txt=name==='amazonses.com'?'v=spf1 ip4:192.0.2.0/24 -all':name==='send.example.test'?records[0].value:name==='selector._domainkey.example.test'?records[2].value:name==='_dmarc.example.test'?'v=DMARC1; p=none; psd=n':null;
  const alias={'mail.example.test':'sendgrid.net','s1._domainkey.example.test':'s1.domainkey.sendgrid.net','s2._domainkey.example.test':'s2.domainkey.sendgrid.net'}[name];
  if(type==='CNAME'&&alias)return Response.json({Status:0,Answer:[{name,type:5,TTL:300,data:alias+'.'}]});
  if(type==='MX'&&name==='send.example.test')return Response.json({Status:0,Answer:[{name,type:15,TTL:300,data:'10 feedback.example.test.'}]});
  return Response.json(txt?{Status:0,Answer:[{name,type:16,TTL:300,data:JSON.stringify(txt)}]}:{Status:0,Authority:[{name:'example.test',type:6,TTL:300,data:'ns.example.test host.example.test 1 300 300 300 300'}]});
 }
 if(url.hostname==='api.resend.com'){
  if(path==='/domains')return Response.json({data:[domain],has_more:false});
  if(path==='/domains/domain-1')return Response.json({...domain,records});
  if(path==='/usage')return Response.json({object:'usage',emails:{daily:{used:0,limit:100,sent:0,received:0,resets_at:new Date(Date.now()+86400000).toISOString()},monthly:{used:0,limit:3000,sent:0,received:0,resets_at:new Date(Date.now()+86400000).toISOString()}}});
  if(path==='/emails'&&method==='POST'){await request.arrayBuffer();return Response.json({id:crypto.randomUUID()});}
  if(path==='/emails')return Response.json({data:[],has_more:false});
 }
 if(url.hostname==='api.sendgrid.com'){
  if(path==='/v3/mail/send'&&method==='POST'){await request.arrayBuffer();return new Response(null,{status:202,headers:{'x-message-id':crypto.randomUUID()}});}
  if(path==='/v3/whitelabel/domains')return Response.json([{id:1,user_id:1,domain:'example.test',valid:true,automatic_security:true,dns:{mail_cname:{valid:true,type:'cname',host:'mail.example.test',data:'sendgrid.net'},dkim1:{valid:true,type:'cname',host:'s1._domainkey.example.test',data:'s1.domainkey.sendgrid.net'},dkim2:{valid:true,type:'cname',host:'s2._domainkey.example.test',data:'s2.domainkey.sendgrid.net'}}}]);
 }
 if(url.origin==='https://rer-hosted-check.invalid'&&path.startsWith('/api/v1/')){
  if(!request.headers.get('Authorization')?.startsWith('Bearer '))return new Response(null,{status:401});
  const key=method+' '+path+' '+request.headers.get('Idempotency-Key');
  if(method==='POST'&&replies.has(key))return Response.json(replies.get(key));
  if(path==='/api/v1/create'&&method==='POST'){
   const body=await request.json();
   // Network payloads must not contain audience/contact or managed tokens.
   if(/\{\{|@example\.test/i.test(JSON.stringify(body)))return new Response('Unsafe design payload',{status:400});
   const id=crypto.randomUUID(),run={id,candidates:body.candidates.map(item=>({slot:item.slot,status:'pending'}))};runs.set(id,run);replies.set(key,run);return Response.json(run,{status:201});
  }
  const candidate=/^\/api\/v1\/create\/([^/]+)\/candidates\/([^/]+)(\/image)?$/.exec(path);
  if(candidate&&runs.has(candidate[1])){
   const run=runs.get(candidate[1]),slot=run.candidates.find(item=>item.slot===candidate[2]);
   if(!slot)return new Response(null,{status:404});
   if(candidate[3])return new Response(bytes(image),{headers:{'Content-Type':'image/png'}});
   if(method==='POST'){slot.status='succeeded';replies.set(key,run);return Response.json(run);}
  }
  const run=/^\/api\/v1\/create\/([^/]+)$/.exec(path);if(run&&runs.has(run[1]))return Response.json(runs.get(run[1]));
  if(path==='/api/v1/convert'&&method==='POST'){
   await request.formData();const id=crypto.randomUUID(),layout={id,status:'succeeded',output:'layerdoc',model:'fast',result:{kind:'layerdoc',media_type:'application/vnd.12ui.layerdoc+json;version=2',sha256:await digest(layerDoc),size_bytes:new TextEncoder().encode(layerDoc).length}};
   layouts.set(id,layout);replies.set(key,layout);return Response.json(layout,{status:202});
  }
  const layout=/^\/api\/v1\/convert\/([^/]+)$/.exec(path);if(layout&&layouts.has(layout[1]))return request.headers.get('Accept')==='application/octet-stream'?new Response(layerDoc,{headers:{'Content-Type':'application/vnd.12ui.layerdoc+json;version=2'}}):Response.json(layouts.get(layout[1]));
 }
 return new Response('Undeclared provider operation',{status:502});
}};
