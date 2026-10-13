import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {migrate} from '../prior-approval/fixture';
import {rows} from './native';
const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');

test('native Worker rejects substituted approval evidence, then authenticated explicit reapproval recovers it',async()=>{
  const bundle=await build({external:['node:*'],entryPoints:['tests/approval-binding/worker-entry.ts'],bundle:true,write:false,format:'esm',platform:'browser',alias:{'@':join(process.cwd(),'src')},logLevel:'silent'});
  const worker=new Miniflare({host:'127.0.0.1',port: 0,cf:false,telemetry:{enabled:false},workers:[{config:{name:'binding-worker',type:'worker',compatibilityDate:'2026-08-31',
    compatibilityFlags:['nodejs_compat'],
    manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:bundle.outputFiles[0].text}}},env:{DB:{type:'d1',id:crypto.randomUUID()}}}}]});
  try {
    const db=await worker.getD1Database('DB');await migrate(db);
    const seeded=await worker.dispatchFetch('https://mango.example.test/fixture');expect(seeded.status).toBe(200);
    const {campaign,session}=await seeded.json();
    const url=`https://mango.example.test/api/campaigns/${campaign.campaignId}`;
    const headers={Host:'mango.example.test','Content-Type':'application/json',Origin:'https://mango.example.test',Cookie:`__Host-operator_session=${session}`};
    const body=JSON.stringify({revisionId:campaign.revisionId,idempotencyKey:campaign.idempotencyKey});
    const response=await worker.dispatchFetch(`${url}/approve`,{method:'POST',headers,body});
    expect(response.status,await response.clone().text()).toBe(200);
    const original=await rows(db,'campaign_approval_requests');
    const inspection=await (await worker.dispatchFetch('https://mango.example.test/inspect')).json();expect(inspection.ready).toBe(true);
    // This models native persistence corruption, not a public mutation endpoint.
    await db.prepare("UPDATE sender_verification_associations SET inspection_id=? WHERE kind='approval'").bind(inspection.lease.id).run();
    const dispatch=()=>worker.dispatchFetch('https://mango.example.test/dispatch',{method:'POST',headers,body:JSON.stringify({...campaign,channel:'email'})});
    expect(await (await dispatch()).json()).toEqual({outbound:[],calls:[]});
    expect((await worker.dispatchFetch(`${url}/approve`,{method:'POST',headers,body})).status).toBe(409);
    const recovery=JSON.stringify({revisionId:campaign.revisionId,idempotencyKey:'worker-explicit-reapproval'});
    expect((await worker.dispatchFetch(`${url}/reapprove`,{method:'POST',headers:{'Content-Type':'application/json'},body:recovery})).status).toBe(401);
    expect((await worker.dispatchFetch(`${url}/reapprove`,{method:'POST',headers:{...headers,Origin:'https://untrusted.example'},body:recovery})).status).toBe(403);
    const recovered=await worker.dispatchFetch(`${url}/reapprove`,{method:'POST',headers,body:recovery});
    expect(recovered.status,await recovered.clone().text()).toBe(200);
    expect((await (await dispatch()).json()).outbound).toHaveLength(1);
    expect((await (await dispatch()).json()).outbound).toHaveLength(0);
    expect(await rows(db,'campaign_approval_requests')).toBe(original);
    expect(await db.prepare('SELECT transport_disposition FROM recipient_steps').first()).toEqual({transport_disposition:'accepted'});
  } finally {await worker.dispose();}
});
