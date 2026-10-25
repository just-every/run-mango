import {expect} from '@playwright/test';
import {parseFragment} from 'parse5';
import {json,approve,dispatch,draftCampaign,type Installation} from '../go-live/harness';
import {chosenCatalogEdge} from '../go-live/chosen-catalog-edge';
import {providerEdge} from '../go-live/edge';
type Catalog=ReturnType<typeof chosenCatalogEdge>;
type Campaign={campaignId:string;revisionId:string};
type Edge=Awaited<ReturnType<typeof providerEdge>>;
const encoded=(body:string)=>/data-mango-catalog="([^"]+)"/.exec(body)![1];
const state=(body:string)=>JSON.parse(Buffer.from(encoded(body),'base64').toString());
const packed=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64');
const refusal={error:'catalog_unavailable',detail:'The chosen catalog values are unavailable. Sync the connected catalog and try again.'};

export async function catalogRoleProof(site:Installation,catalog:Catalog,owner:string,body:string){
 const cookies:Record<string,string>={owner};
 for(const role of ['admin','manager','author','analyst','support']){const id='catalog-role-'+role;cookies[role]=await site.open(`synthetic-mango-${role}@example.test`,id);await json(await site.call(`/api/operators/${id}/role`,{method:'PUT',cookie:owner,body:{role}}),200);expect((await json(await site.call('/api/operator',{cookie:cookies[role]}),200)).operator.role).toBe(role);}
 for(const [role,cookie] of [...Object.entries(cookies),['anonymous',undefined]] as Array<[string,string|undefined]>)for(const preview of [false,true]){
  const before=catalog.requests(),denied=preview?role==='support':['analyst','support'].includes(role),expected=role==='anonymous'?401:denied?403:200;
  const result=await json(await site.call(preview?'/api/catalog/preview':'/api/catalog/products?q=synthetic-mango-',{method:preview?'POST':'GET',cookie,body:preview?{emailBody:body}:undefined}),expected);
  if(expected===403)expect(result.error).toBe('role_forbidden');if(expected!==200)expect(catalog.requests()).toBe(before);else if(preview)expect(Object.values(result.renderings).flatMap((value:any)=>value.items)).toHaveLength(6);
 }
 const draft=await json(await site.call('/api/campaigns',{method:'POST',cookie:cookies.author,body:{}}),201);
 await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie:cookies.author,body:{emailBody:body}}),200);
 const stored=(await json(await site.call(`/api/campaigns/${draft.campaignId}`,{cookie:owner}),200)).revision;expect(stored.emailBody).toBe(body);
 const before=catalog.requests();expect(await json(await site.call(`/api/campaigns/${draft.campaignId}/approve`,{method:'POST',cookie:cookies.author,body:{revisionId:draft.revisionId,idempotencyKey:'synthetic-mango-author-denial'}}),403)).toMatchObject({error:'role_forbidden'});expect(catalog.requests()).toBe(before);
 console.log('Catalog guard: six roles and anonymous pass exact denials without edge reads');return {draft,author:cookies.author,stored};
}

export async function catalogGuardJourney(site:Installation,catalog:Catalog,edge:Edge,cookie:string,body:string,email:string,sources:{original:Campaign;tracked:Campaign}){
 const began=Date.now();catalog.reset();
 const role=await catalogRoleProof(site,catalog,cookie,body),original=state(body),key=encoded(body);
 const invalid:Array<{name:string;value:string;reads?:boolean}>=[
  {name:'non-canonical',value:Buffer.from(JSON.stringify(original,null,2)).toString('base64')},
  {name:'overlong canonical state',value:packed({...original,items:[{...original.items[0],productId:'gid://shopify/Product/'+'1'.repeat(6500)}]})},
  {name:'non-Shopify gid',value:packed({...original,items:[{...original.items[0],productId:'gid://other/Product/160'}]})},
  {name:'malformed gid',value:packed({...original,items:[{...original.items[0],variantId:'gid://shopify/ProductVariant/not-a-number'}]})},
  {name:'foreign variant',value:packed({...original,items:[{...original.items[0],variantId:'gid://shopify/ProductVariant/1611'}]}),reads:true},
  {name:'seven items',value:packed({...original,items:[...original.items,original.items[0]]})},
  {name:'two-item product',value:packed({...original,layout:'product',items:original.items.slice(0,2)})},
  {name:'unknown provider',value:packed({...original,provider:'other'})},
  {name:'extra block key',value:packed({...original,title:'copied value'})},
  {name:'extra item key',value:packed({...original,items:[{...original.items[0],price:'copied value'}]})},
 ];
 for(const input of invalid){if(input.name==='overlong canonical state')expect(input.value.length).toBeGreaterThan(8192);const before=catalog.requests();expect(await json(await site.call(`/api/campaign-revisions/${role.draft.revisionId}`,{method:'PATCH',cookie:role.author,body:{emailBody:body.replace(key,input.value)}}),400),input.name).toMatchObject(refusal);expect((await json(await site.call(`/api/campaigns/${role.draft.campaignId}`,{cookie}),200)).revision).toEqual(role.stored);if(!input.reads)expect(catalog.requests(),input.name).toBe(before);}
 const before=catalog.requests();expect(await json(await site.call('/api/catalog/products?q='+'x'.repeat(201),{cookie}),400)).toEqual({error:'invalid_catalog_query'});expect(catalog.requests()).toBe(before);
 console.log('Catalog guard: malformed payloads preserve the exact stored revision');
 const marketing=()=>edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe']);
 const sendCase=async(number:number,change:()=>void,blocked=false)=>{
  catalog.reset();const clock=await site.control('/_golive/clock',{advanceMs:25*3600000,hold:true});cookie=await site.open();await site.control('/_golive/sender-evidence');const due=new Date(clock.now+3600000),draft=await draftCampaign(site,cookie,'synthetic-mango-'+number,[email],due);
  await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailBody:body,trackingEnabled:false}}),200);await approve(site,cookie,draft);change();const before=marketing().length;await site.control('/_golive/clock',{advanceMs:3600001});const rows=await dispatch(site,draft.campaignId,due),sends=marketing().slice(before);
  if(blocked){expect(rows.map(row=>({disposition:row.transport_disposition,reason:row.skip_reason}))).toEqual([{disposition:'skipped',reason:'catalog-blocked'}]);expect(sends).toEqual([]);const detail=await json(await site.call(`/api/campaigns/${draft.campaignId}`,{cookie}),200);expect(detail.catalogSummary.skipped).toEqual([{reason:'catalog-blocked',count:1}]);}
  else{expect(rows.map(row=>row.transport_disposition)).toEqual(['accepted']);expect(sends).toHaveLength(1);}
  return sends[0]?.body.content.find((part:any)=>part.type==='text/html').value as string|undefined;
 };
 const escaped=(await sendCase(400,()=>catalog.title(160,'<script>synthetic-mango-400</script> {{displayName}} {{physical_address}}')))!;
 expect(escaped).toContain('&lt;script&gt;synthetic-mango-400&lt;/script&gt;');expect(escaped).not.toContain('<script>');expect(escaped).toContain('{{displayName}} {{physical_address}}');expect(escaped).not.toContain('Synthetic reader');
 await sendCase(401,()=>catalog.url(160,'javascript:synthetic-mango-401'),true);
 await sendCase(402,()=>catalog.url(160,'http://myshop.com/products/product-160'),true);
 await sendCase(403,()=>catalog.image(160,'https://untrusted.example.test/synthetic-mango-403.png'),true);
 console.log('Catalog guard: escaped opaque values and unsafe destinations pass');
 for(const [index,door] of ['template','duplicate','followup'].entries()){
  catalog.reset();const clock=await site.control('/_golive/clock',{advanceMs:25*3600000,hold:true});cookie=await site.open();await site.control('/_golive/sender-evidence');const due=new Date(clock.now+3600000);catalog.unpublish(160);catalog.stock(1611,0);
  let copy:Campaign;
  if(door==='template'){const template=await json(await site.call('/api/campaign-templates',{method:'POST',cookie,body:{revisionId:sources.original.revisionId,name:'synthetic-mango-410'}}),201);const snapshots=await site.rows(`SELECT composition_json FROM campaign_templates WHERE id='${template.id}'`);expect(JSON.parse(snapshots[0].composition_json).composition.emailBody).toBe(body);copy=await json(await site.call(`/api/campaign-templates/${template.id}/start`,{method:'POST',cookie,body:{}}),201);}
  else copy=await json(await site.call(`/api/campaigns/${door==='duplicate'?sources.original.campaignId:sources.tracked.campaignId}/${door==='duplicate'?'duplicate':'followup'}`,{method:'POST',cookie,body:door==='duplicate'?{}:{subject:'synthetic-mango-412',delayHours:1,metric:'click'}}),201);
  const read=async()=>(await json(await site.call(`/api/campaigns/${copy.campaignId}`,{cookie}),200)).revision,stored=await read();expect(stored.emailBody).toBe(body);expect(state(stored.emailBody)).toEqual(original);expect(stored.emailBody).toContain(`<div data-mango-catalog="${key}"></div>`);
  const hidden=await json(await site.call('/api/campaign-authoring/email-size',{method:'POST',cookie,body:{campaignId:copy.campaignId,emailBody:stored.emailBody}}),200);catalog.reset();const visible=await json(await site.call('/api/campaign-authoring/email-size',{method:'POST',cookie,body:{campaignId:copy.campaignId,emailBody:stored.emailBody}}),200);expect(hidden.htmlBytes).toBe(visible.htmlBytes);expect(hidden.textBytes).toBe(visible.textBytes);
  await json(await site.call(`/api/campaign-revisions/${copy.revisionId}`,{method:'PATCH',cookie,body:{steps:[{channel:'email',timezone:'Australia/Brisbane',scheduledAt:due.toISOString(),sendByAt:new Date(due.getTime()+7200000).toISOString(),whyThisTime:'Synthetic catalog door proof'}]}}),200);await approve(site,cookie,copy);
  const title='synthetic-mango-'+(410+index),price=(41+index)+'.00',image='https://cdn.shopify.com/synthetic-mango-161.png';catalog.title(160,title);catalog.price(1601,price);catalog.image(160,image);const before=marketing().length;await site.control('/_golive/clock',{advanceMs:3600001});const rows=await dispatch(site,copy.campaignId,due);expect(rows.map(row=>row.transport_disposition)).toEqual(['accepted']);const sends=marketing().slice(before);expect(sends).toHaveLength(1);const html=sends[0].body.content.find((part:any)=>part.type==='text/html').value;expect(Buffer.byteLength(html)).toBeLessThanOrEqual(visible.htmlBytes);
  const elements=(node:any):any[]=>node.childNodes?.flatMap((child:any)=>child.tagName?[child,...elements(child)]:[])??[],text=(node:any):string=>node.nodeName==='#text'?node.value:(node.childNodes??[]).map(text).join('');const nodes=elements(parseFragment(html));expect(nodes.filter(node=>node.tagName==='h3')).toHaveLength(6);const heading=nodes.find(node=>node.tagName==='h3'&&text(node)===title);expect(heading).toBeTruthy();expect(heading.parentNode.childNodes.find((node:any)=>node.tagName==='img').attrs.find((attr:any)=>attr.name==='src').value).toBe(image);expect(text(heading.parentNode)).toContain('AUD '+price);expect((await read()).emailBody).toBe(body);
 }
 expect((await json(await site.call(`/api/campaigns/${sources.original.campaignId}`,{cookie}),200)).revision.emailBody).toBe(body);expect(edge.unexpected).toEqual([]);catalog.reset();console.log(`Catalog guard journey elapsed=${Date.now()-began}ms; native imported history and MOVE-011 conversion do not create catalog choices; imported and flow authoring remain gaps`);
}
