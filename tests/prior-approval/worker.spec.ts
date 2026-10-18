import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {migrate} from './fixture';
import {approvalBytes} from './legacy';
const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');

test('native Worker requires a signed-in explicit reapproval and preserves immutable historical approval',async()=>{
  const bundle=await build({external:['node:*'],entryPoints:['tests/prior-approval/worker-entry.ts'],bundle:true,write:false,format:'esm',platform:'browser',alias:{'@':join(process.cwd(),'src')},logLevel:'silent'});
  const worker=new Miniflare({host:'127.0.0.1',port: 0,cf:false,telemetry:{enabled:false},workers:[{config:{name:'prior-approval-worker',type:'worker',compatibilityDate:'2026-08-31',
    compatibilityFlags:['nodejs_compat'],
    manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:bundle.outputFiles[0].text}}},env:{DB:{type:'d1',id:crypto.randomUUID()}}}}]});
  try {
    const db=await worker.getD1Database('DB');await migrate(db,0,12);await migrate(db,15,33);
    // Keep sender history at its old schema while using current native identity tables.
    await migrate(db,58,72);
    const seed=await worker.dispatchFetch('https://mango.example.test/test/legacy');
    expect(seed.status,await seed.clone().text()).toBe(200);
    const {campaign,operatorId,session}=await seed.json();const original=await approvalBytes(db);
    await migrate(db,13,14);await migrate(db,34,57);await migrate(db,73);
    const url=`https://mango.example.test/api/campaigns/${campaign.campaignId}/reapprove`;
    const body=JSON.stringify({revisionId:campaign.revisionId,idempotencyKey:`explicit-${campaign.revisionId}`});
    expect((await worker.dispatchFetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body})).status).toBe(401);
    const headers={Host:'mango.example.test','Content-Type':'application/json',Origin:'https://mango.example.test',Cookie:`__Host-operator_session=${session}`};
    expect((await worker.dispatchFetch(url,{method:'POST',headers,body})).status).toBe(409);
    expect((await worker.dispatchFetch('https://mango.example.test/test/prove')).status).toBe(200);
    const dispatch=()=>worker.dispatchFetch('https://mango.example.test/test/dispatch',{method:'POST',headers,body:JSON.stringify({...campaign,channel:'email'})});
    expect(await (await dispatch()).json()).toMatchObject({outbound:[]});
    const ordinary=await worker.dispatchFetch(url.replace('/reapprove','/approve'),{method:'POST',headers,body});
    expect(ordinary.status).toBe(409);
    const first=await worker.dispatchFetch(url,{method:'POST',headers,body});
    expect(first.status,await first.clone().text()).toBe(200);
    expect(await first.json()).toMatchObject({status:'reapproved',idempotent:false});
    expect(await (await worker.dispatchFetch(url,{method:'POST',headers,body})).json()).toMatchObject({status:'reapproved',idempotent:true});
    expect(await db.prepare("SELECT actor_id FROM lifecycle_audit_entries WHERE action='sender-reapproved'").first()).toEqual({actor_id:operatorId});
    expect((await (await dispatch()).json()).outbound).toHaveLength(1);
    expect((await (await dispatch()).json()).outbound).toHaveLength(0);
    expect(await db.prepare('SELECT transport_disposition FROM recipient_steps').first()).toEqual({transport_disposition:'accepted'});
    expect(await approvalBytes(db)).toBe(original);
  } finally {await worker.dispose();}
});
