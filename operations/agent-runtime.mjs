import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {dirname,join} from 'node:path';
import {resolveDeclaration} from '../scripts/installer/deploy-declaration.mjs';
import {nativeHttp,mailAllowance} from '../tests/agent-door/native-http.mjs';
const require=createRequire(import.meta.url);
const rer=dirname(require.resolve('@runeditrun/rer/package.json'));
const {serveHosted,HOSTED_ORIGIN}=await import(pathToFileURL(join(rer,'cli/hosted-output.mjs')));
const {createAgentConformanceNetwork}=await import(pathToFileURL(join(rer,'cli/agent-network.mjs')));
const {verificationReviewers}=await import(pathToFileURL(join(rer,'cli/agent-reviewers.mjs')));

/** The production build, migrations and Queue consumer; only paid edges are fake. */
export async function agentRuntime(bindings){
 const email='owner@example.test',reviewer='synthetic-mango-reviewer@example.test';
 const reviewers=await verificationReviewers(process.cwd(),[{label:'quality',email:reviewer,initializer:'tests/agent-door/reviewer.mjs'}],email);
 const network=await createAgentConformanceNetwork(process.cwd(),{
  module:'tests/agent-door/network.mjs',origins:['https://api.openai.com','https://woo.example.test','https://api.sendgrid.com','https://api.resend.com','https://cloudflare-dns.com',HOSTED_ORIGIN],
 },{email});
 let hosted;
 try{
  hosted=await serveHosted(process.cwd(),{declaration:resolveDeclaration(process.cwd(),'verify'),bindings:Object.fromEntries(Object.entries({
   ...bindings,OWNER_EMAIL:email,MAIL_PROVIDER:'sendgrid',MAIL_PROVIDER_API_KEY:'disposable-mail-key',MAIL_AUTH_FROM:email,
   MAIL_SENDER_NAME:'Example',MAIL_REPLY_TO:email,MAIL_PHYSICAL_ADDRESS:'Test address',MANGO_ALLOWED_LINK_HOSTS:'example.test',
   MANGO_TEST_EMAIL_ALLOWLIST:email,MARKETING_MAIL_API_KEY:undefined,MARKETING_MAIL_WEBHOOK_SECRET:undefined,
   MAILBOX_RECEIPT_URL:undefined,MAILBOX_RECEIPT_RECIPIENT:undefined,
   SMS_PROVIDER_API_KEY:'disposable-sms-key',SMS_WEBHOOK_SECRET:'disposable-sms-secret',
   SMS_CONFIRMATION_SENDER:(await import('../tests/agent-door/sms/sender.mjs')).default(),
   SMS_PROGRAMME_POLICY:(await import('../tests/agent-door/sms/policy.mjs')).default(),
   MANGO_TEST_SMS_ALLOWLIST:(await import('../tests/agent-door/sms/allowlist.mjs')).default(),
   MANGO_EMAIL_HANDOFFS_PER_MINUTE:(await import('../tests/agent-door/mail-rate.mjs')).default(),
   MANGO_SMS_HANDOFFS_PER_MINUTE:(await import('../tests/agent-door/mail-rate.mjs')).default(),
   AI_PROVIDER_API_KEY:'disposable-model-key',AI_PROVIDER_MODEL:(await import('../tests/agent-door/model.mjs')).default(),
   DESIGN_PROVIDER_API_KEY:'disposable-design-key',DESIGN_PROVIDER_ORIGIN:HOSTED_ORIGIN,
  }).filter(([,value])=>value!==undefined)),outboundService:async request=>{
   const observed=reviewers.observes(request)?request.clone():null;
   const response=await network.fetch(request);
   if(observed)await reviewers.capture(observed,response.clone());
   return response;
  }});
  const request=(absolute,init={})=>hosted.fetch(new URL(absolute).pathname.slice(1)+new URL(absolute).search,init);
  return {db:await hosted.database('DB'),fixtures:network.fixtures,mail:network.mail,request,
   call(path,{method='GET',cookie,body,headers={},origin=HOSTED_ORIGIN,form=false}={}){
    return request(new URL(path,HOSTED_ORIGIN),{method,headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1',
     'Content-Type':form?'application/x-www-form-urlencoded':'application/json',...(cookie?{Cookie:cookie}:{}),...headers},
     ...(body?{body:form?new URLSearchParams(body).toString():JSON.stringify(body)}:{})});
   },
   async prepareOwner(cookie){
    const http=nativeHttp({request,origin:HOSTED_ORIGIN,cookie});
    await http('/api/settings/sender',{displayName:'Orchard newsletter',fromEmail:email,replyToEmail:email,physicalAddress:'24 Orchard Lane, Test City'},'PUT');
    await mailAllowance();
    await reviewers.initialize('quality',{cookie},{request,origin:HOSTED_ORIGIN});
   },
   async token(){
    const links=network.mail.read().flatMap(message=>message.text.match(/https:\/\/[^\s<>]+/g)??[]).map(value=>new URL(value));
    return links.findLast(link=>link.pathname==='/auth/confirm')?.searchParams.get('token');
   },
   async close(){reviewers.close();try{await hosted.close();}finally{await network.close();}},
  };
 }catch(error){reviewers.close();await hosted?.close();await network.close();throw error;}
}
