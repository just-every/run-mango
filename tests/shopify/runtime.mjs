import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {nativeQueueSettlement} from './native-queue.mjs';
import {sqlStatements} from '../../operations/sql-statements.mjs';
const require=createRequire(import.meta.url);
const {Miniflare,_enableControlEndpoints}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');
export const secret='shopify-test-only-secret';
export async function shopifyRuntime(){
  // API and Queue proof does not load the separate TanStack document renderer.
  const bundled=await build({entryPoints:[resolve('tests/shopify/worker.ts')],bundle:true,write:false,format:'esm',platform:'browser',external:['node:*','@tanstack/react-start/server-entry',resolve('src/core/app/private-server.tsx')],alias:{'@':resolve('src')}});
  const values={SESSION_SIGNING_KEY:'synthetic-test-session-secret-more-than-thirty-two-bytes',AUTH_SETUP_TOKEN:'synthetic-test-setup-secret-more-than-thirty-two-bytes',INITIAL_OPERATOR_EMAILS:'owner@example.test',CONTACT_HASH_SALT:'test-contact-salt',MAIL_PROVIDER:'sendgrid',MAIL_PROVIDER_API_KEY:'test-api-key',MAIL_AUTH_FROM:'owner@example.test',MAIL_WEBHOOK_SECRET:'test-key',MAIL_WEBHOOK_ID:'test-hook',MANGO_PUBLIC_BASE_URL:'https://mango.example.test',MANGO_APP_VERSION:'test',MANGO_ALLOWED_LINK_HOSTS:'example.test',MANGO_TEST_EMAIL_ALLOWLIST:'owner@example.test',MANGO_RECONCILIATION_INTERVAL_MINUTES:'15',MANGO_UNRESOLVED_OUTCOME_HOURS:'48',MANGO_EMAIL_HANDOFFS_PER_MINUTE:'10',MANGO_DELIVERABILITY_WINDOW_DAYS:'30',MAIL_SENDER_NAME:'Example',MAIL_REPLY_TO:'owner@example.test',MAIL_PHYSICAL_ADDRESS:'Test address',COMMERCE_STORE_URL:'https://mango-shop.myshopify.com',COMMERCE_EXCLUSIVE_SHOP:'mango-shop.myshopify.com',COMMERCE_API_TOKEN:'test-admin-key',COMMERCE_WEBHOOK_SECRET:secret,COMMERCE_OBSERVATION_CHANNEL:'test-channel',COMMERCE_APP_INSTALLATION_ID:'gid://shopify/AppInstallation/1',COMMERCE_PIXEL_ID:'gid://shopify/WebPixel/2',COMMERCE_PROXY_PATH:'/apps/mango-signals'};
  _enableControlEndpoints();
  const queueName='shopify-native-jobs';
  const mf=new Miniflare({host:'127.0.0.1',cf:false,telemetry:{enabled:false},workers:[{config:{name:'shopify-connection-test',type:'worker',triggers:[{type:'queue',name:queueName,maxBatchSize:1}],compatibilityDate:'2026-09-01',compatibilityFlags:['nodejs_compat'],manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:bundled.outputFiles[0].text}}},env:{...Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{type:'json',value}])),MANGO_JOBS:{type:'queue',name:queueName},DB:{type:'d1',id:crypto.randomUUID()},ASSETS_BUCKET:{type:'r2',name:crypto.randomUUID()}}}}]});
  try{
    const db=await mf.getD1Database('DB');
    for(const name of (await readdir('migrations/core')).filter(n=>n.endsWith('.sql')).sort())await db.batch(sqlStatements(await readFile(`migrations/core/${name}`,'utf8')).map(sql=>db.prepare(sql)));
    for(const name of ['test_mail','test_queue_outcomes'])await db.prepare(`CREATE TABLE ${name}(id INTEGER PRIMARY KEY,body TEXT NOT NULL)`).run();
    await db.prepare('CREATE TABLE test_shopify(id TEXT PRIMARY KEY,body TEXT NOT NULL,elapsed_ms INTEGER NOT NULL DEFAULT 0)').run();
    await db.prepare('CREATE TABLE test_shopify_http(request_key TEXT,started_at INTEGER,ended_at INTEGER,lease_expires_at INTEGER)').run();
    const settle=await nativeQueueSettlement(mf,db,queueName);
    const call=(path,{method='GET',body,raw,cookie,headers={},protocol='https:'}={})=>path==='/test/run-queue'?settle():mf.dispatchFetch('http://localhost/test-dispatch',{method:'POST',redirect:'manual',body:JSON.stringify({url:`${protocol}//mango.example.test${path}`,method,headers:{Host:'mango.example.test',Origin:'https://mango.example.test','CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers},...(raw!==undefined?{body:raw}:body!==undefined?{body:JSON.stringify(body)}:{})})});
    const fixture=(id,body,elapsedMs=0)=>db.prepare('INSERT INTO test_shopify(id,body,elapsed_ms) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body,elapsed_ms=excluded.elapsed_ms').bind(id,JSON.stringify(body),elapsedMs).run();
    return {db,call,fixture,close:()=>mf.dispose(),async owner(bootstrapOwner=true){
      if(bootstrapOwner) { const bootstrap=await call('/auth/bootstrap',{method:'POST',body:{token:values.AUTH_SETUP_TOKEN,displayName:'Owner'}});if(bootstrap.status!==303)throw new Error(`Bootstrap ${bootstrap.status}`); }
      const requested=await call('/auth/magic-link',{method:'POST',body:{email:'owner@example.test'}});if(requested.status!==202)throw new Error(`Magic link ${requested.status}`);
      const mail=await db.prepare('SELECT body FROM test_mail ORDER BY id DESC LIMIT 1').first();
      const token=new URL(JSON.parse(mail.body).content[0].value.match(/https:\/\/\S+/)[0]).searchParams.get('token');
      const confirmed=await call('/auth/confirm',{method:'POST',body:{token}});if(confirmed.status!==303)throw new Error(`Confirmation ${confirmed.status}`);
      return confirmed.headers.get('set-cookie').split(';')[0];
    }};
  }catch(error){await mf.dispose();throw error;}
}
