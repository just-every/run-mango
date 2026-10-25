import {expect,type APIRequestContext} from '@playwright/test';
import {testIdentity} from '../support/test-identity';
import type {DecisionRuntime} from '../proposals-decision/runtime';
export async function reusableRoleProof(runtime:DecisionRuntime){
  const source=await runtime.call('/api/reusable-email-blocks',{name:'synthetic-mango-155',block:{html:'<p>synthetic-mango-155 footer</p>'}});expect(source.status).toBe(201);
  const identity=testIdentity(runtime.platform),now=new Date();
  await identity.importLocalDemoOperator({id:'synthetic-mango-155-author',email:'synthetic-mango-155@example.test',displayName:'Synthetic author'},now);
  await runtime.db.batch([runtime.db.prepare("UPDATE oa_operators SET role='admin' WHERE id='synthetic-mango-155-author'"),runtime.db.prepare("INSERT INTO operator_product_roles(operator_id,role,unmasked_contacts,updated_by,updated_at) VALUES('synthetic-mango-155-author','author',1,'proposal-operator',?)").bind(now.getTime())]);
  const session=await identity.createTestSession('synthetic-mango-155-author');
  const call=(path:string,body:unknown,method='POST')=>runtime.call(path,body,true,method,session.token);
  expect((await call('/api/reusable-email-blocks',{name:'synthetic-mango-156',block:{html:'<p>Refused author footer</p>'}})).status).toBe(403);
  expect((await call('/api/reusable-email-blocks/'+source.body.id,{name:source.body.name,block:source.body.block,version:source.body.version},'PATCH')).status).toBe(403);
  expect((await call('/api/reusable-email-blocks/'+source.body.id+'/place',{version:source.body.version,target:{kind:'campaign',id:'synthetic-mango-155'}})).status).toBe(403);
  expect((await call('/api/reusable-email-blocks/'+source.body.id+'/placements',{target:{kind:'campaign',id:'synthetic-mango-155'}},'DELETE')).status).toBe(403);
  const list=await runtime.call('/api/reusable-email-blocks',undefined,true,'GET',session.token);expect(list.status).toBe(200);expect(list.body.canWrite).toBe(false);
  expect((await runtime.call('/api/reusable-email-blocks',{name:'synthetic-mango-157',block:{html:'<script>Refused</script>'}})).status).toBe(409);
}
export async function prepareReusableProof(request:APIRequestContext,origin:string,headers:Record<string,string>,source:{id:string;version:number}){
  const create=async(index:number)=>{
    const response=await request.post(origin+'/api/campaigns',{headers,data:{}});expect(response.status()).toBe(201);const draft=await response.json();
    const saved=await request.patch(origin+'/api/campaign-revisions/'+draft.revisionId,{headers,data:{name:'synthetic-mango-'+(160+index),emailSubject:'Synthetic reusable footer',preheader:'Synthetic footer proof',emailBody:'<p>synthetic-mango-160 letter</p>',steps:[{channel:'email',timezone:'Australia/Brisbane',scheduledAt:'2031-06-07T00:00:00.000Z',sendByAt:'2031-06-07T13:59:00.000Z',whyThisTime:'Operator selected'}]}});expect(saved.status()).toBe(200);return draft as {campaignId:string;revisionId:string};
  };
  const drafts=await Promise.all([0,1,2].map(create));
  const template=await request.post(origin+'/api/campaign-templates',{headers,data:{revisionId:drafts[0].revisionId,name:'synthetic-mango-160-template'}});expect(template.status()).toBe(201);const templateId=(await template.json()).id;
  const graph={name:'synthetic-mango-160-flow',trigger:'Synthetic confirmed',nodes:[{id:'start',kind:'trigger',label:'Confirmed',next:['email']},{id:'email',kind:'email',label:'Synthetic footer email',next:['end'],email:{templateId,subject:'Synthetic footer',preheader:'Synthetic flow footer',html:'<p>synthetic-mango-160 flow</p>',text:'synthetic-mango-160 flow'}},{id:'end',kind:'exit',label:'Exit',next:[]}]};
  const flow=await request.post(origin+'/api/flow-drafts',{headers,data:graph});expect(flow.status()).toBe(201);const flowId=(await flow.json()).id;
  const targets=[...drafts.map(draft=>({kind:'campaign',id:draft.revisionId})),{kind:'template',id:templateId},{kind:'flow',id:flowId,nodeId:'email'}];
  await Promise.all(targets.map(async target=>{const placed=await request.post(origin+'/api/reusable-email-blocks/'+source.id+'/place',{headers,data:{version:source.version,target}});expect(placed.status(),await placed.text()).toBe(200);}));
  const approve=await request.post(`${origin}/api/campaigns/${drafts[2].campaignId}/approve`,{headers,data:{revisionId:drafts[2].revisionId,idempotencyKey:'synthetic-mango-160'}});expect(approve.status(),await approve.text()).toBe(200);
  const read=async(campaignId:string,review=false)=>(await (await request.get(`${origin}/api/campaigns/${campaignId}${review?'/review':''}`,{headers})).json()).revision;
  const before=await Promise.all(drafts.map(draft=>read(draft.campaignId)));
  return {drafts,templateId,flowId,before,read};
}
export async function verifyReusableProof(request:APIRequestContext,origin:string,headers:Record<string,string>,source:{id:string;version:number;name:string;block:unknown},proof:Awaited<ReturnType<typeof prepareReusableProof>>){
  const after=await Promise.all(proof.drafts.map(draft=>proof.read(draft.campaignId)));
  for(const index of [0,1]){expect(after[index].state).toBe('draft');expect(after[index].emailBody).not.toBe(proof.before[index].emailBody);expect(after[index].emailBody).toContain('font-size: 25px !important');}
  expect(after[2].state).toBe('approved');expect(after[2].id).toBe(proof.before[2].id);expect(after[2].emailBody).toBe(proof.before[2].emailBody);
  const editable=await proof.read(proof.drafts[2].campaignId,true);expect(editable.id).not.toBe(after[2].id);expect(editable.state).toBe('draft');expect(editable.emailBody).toContain('font-size: 25px !important');expect(editable.approvedAt).toBeNull();expect(editable.contentDigest).toBeNull();
  const template=await request.get(origin+'/api/flow-drafts/templates/'+proof.templateId,{headers});expect(template.status()).toBe(200);expect((await template.json()).email.html).toContain('font-size: 25px !important');
  const flows=await request.get(origin+'/api/flow-drafts',{headers});expect(flows.status()).toBe(200);const flow=(await flows.json()).revisions.find((flow:any)=>flow.id===proof.flowId);expect(flow.graph.nodes.find((node:any)=>node.id==='email').email.html).toContain('font-size: 25px !important');
  const stale=await request.patch(origin+'/api/reusable-email-blocks/'+source.id,{headers,data:{version:source.version,name:source.name,block:source.block}});expect(stale.status()).toBe(409);
  expect((await proof.read(proof.drafts[0].campaignId)).emailBody).toBe(after[0].emailBody);expect((await proof.read(proof.drafts[2].campaignId)).emailBody).toBe(proof.before[2].emailBody);
  const localBody=after[0].emailBody.replace('Mobile font example','synthetic-mango-160 independent footer');
  const local=await request.patch(origin+'/api/campaign-revisions/'+proof.drafts[0].revisionId,{headers,data:{emailBody:localBody}});expect(local.status()).toBe(400);expect((await local.json()).detail).toContain('Keep independent copy');
  expect((await proof.read(proof.drafts[0].campaignId)).emailBody).toBe(after[0].emailBody);expect((await proof.read(proof.drafts[1].campaignId)).emailBody).toBe(after[1].emailBody);
  const detached=await request.delete(origin+'/api/reusable-email-blocks/'+source.id+'/placements',{headers,data:{target:{kind:'campaign',id:proof.drafts[0].revisionId}}});expect(detached.status()).toBe(200);
  const independent=await request.patch(origin+'/api/campaign-revisions/'+proof.drafts[0].revisionId,{headers,data:{emailBody:localBody}});expect(independent.status()).toBe(200);
  const library=await request.get(origin+'/api/reusable-email-blocks',{headers});expect(library.status()).toBe(200);const current=(await library.json()).blocks.find((block:any)=>block.id===source.id);
  const repeated=await request.patch(origin+'/api/reusable-email-blocks/'+source.id,{headers,data:{version:current.version,name:current.name,block:{...current.block,mobile:{...current.block.mobile,fontSize:24}}}});expect(repeated.status(),await repeated.text()).toBe(200);expect((await repeated.json()).draftRevisions).toEqual([]);
  const [independentAfter,linkedAfter,approvedAfter,editableAfter]=await Promise.all([proof.read(proof.drafts[0].campaignId),proof.read(proof.drafts[1].campaignId),proof.read(proof.drafts[2].campaignId),proof.read(proof.drafts[2].campaignId,true)]);
  expect(independentAfter.emailBody).toBe(localBody);expect(linkedAfter.emailBody).toContain('font-size: 24px !important');expect(approvedAfter.emailBody).toBe(proof.before[2].emailBody);expect(editableAfter.id).toBe(editable.id);expect(editableAfter.emailBody).toContain('font-size: 24px !important');

}
