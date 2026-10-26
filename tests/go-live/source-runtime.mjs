import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {sqlStatements} from '../../operations/sql-statements.mjs';
const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');
/** Existing go-live Worker and real Queue/D1/R2, without an unused document server. */
export async function sourceRuntime(edge,signer){
 const token='synthetic-mango-440-native-source-proof-token',origin='https://mango.example.test';
 const bundled=await build({entryPoints:[resolve('tests/go-live/worker.ts')],bundle:true,write:false,format:'esm',platform:'browser',external:['node:*','@tanstack/react-start/server-entry',resolve('src/core/app/private-server.tsx')],alias:{'@':resolve('src')}});
 const values={LOCAL_BOOTSTRAP_TOKEN:token,GO_LIVE_EDGE_ORIGIN:edge.origin,GO_LIVE_WEBHOOK_KEY:signer.publicKey,GO_LIVE_PUBLIC_ORIGIN:origin,GO_LIVE_PROVIDER_KEY:'synthetic-mango-440',GO_LIVE_DKIM_KEY:edge.dkimKey,GO_LIVE_EXTRA_HOSTS:JSON.stringify(['woo.example.test']),GO_LIVE_COMMERCE:'0',GO_LIVE_SMS:'0',GO_LIVE_AI:'0',GO_LIVE_MAIL_PROVIDER:'sendgrid'};
 const queue='mango-source-proof',mf=new Miniflare({host:'127.0.0.1',cf:false,telemetry:{enabled:false},workers:[{config:{name:'mango-source-proof',type:'worker',triggers:[{type:'queue',name:queue,maxBatchSize:1}],compatibilityDate:'2026-09-08',compatibilityFlags:['nodejs_compat'],manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:bundled.outputFiles[0].text}}},env:{...Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{type:'json',value}])),MANGO_JOBS:{type:'queue',name:queue},DB:{type:'d1',id:crypto.randomUUID()},ASSETS_BUCKET:{type:'r2',name:crypto.randomUUID()}}}}]});
 try{
  const db=await mf.getD1Database('DB');
  for(const name of (await readdir('migrations/core')).filter(name=>name.endsWith('.sql')).sort())await db.batch(sqlStatements(await readFile('migrations/core/'+name,'utf8')).map(sql=>db.prepare(sql)));
  const url=(await mf.ready).origin;
  const call=(path,{method='GET',body,raw,cookie,headers={}}={})=>fetch(url+path,{method,redirect:'manual',headers:{Origin:url,...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},body:raw??(body===undefined?undefined:JSON.stringify(body))});
  return {call,close:()=>mf.dispose(),async open(){const response=await fetch(url+'/_golive/open',{method:'POST',headers:{'X-Test-Token':token,'Content-Type':'application/json'},body:JSON.stringify({email:'owner@example.test',id:'go-live-owner'})});if(response.status!==200)throw Error('Source proof owner fixture refused');const {token:session}=await response.json();const {localSessionCookieName}=await import('../support/local-session.ts');return localSessionCookieName(url)+'='+session;}};
 }catch(error){await mf.dispose();throw error;}
}
