import { localSessionCookieName } from '../support/local-session';
import {createRequire} from 'node:module';
import {readFile, readdir} from 'node:fs/promises';
import {createApp, createAppServices} from '../../src/core/app/app';
import {createFixturePlatform} from '../support/local-platform';
import {testIdentity} from '../support/test-identity';
import {fixtureVerification} from '../support/sender-verification';
import {proposalCommerce,synchronizeProposalSource} from './shopify-edge';
import {sqlStatements} from '../../operations/sql-statements.mjs';
import type {AppBindings} from '../../src/core/shared/platform';
import {proposalGenerationEdge} from './generation-edge';

const require = createRequire(import.meta.url);
const {Miniflare} = createRequire(require.resolve('wrangler/package.json'))('miniflare');

/** Network/provider doubles only. Sessions, routes, audience evaluation and SQL are production code. */
export async function decisionRuntime() {
  const native = new Miniflare({host:'127.0.0.1',port:0,cf:false,telemetry:{enabled:false},workers:[{config:{name:'proposal-routes',type:'worker',compatibilityDate:'2026-08-31',
    manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:'export default {fetch(){return new Response("fixture")}}'}}},
    env:{DB:{type:'d1',id:crypto.randomUUID()},ASSETS_BUCKET:{type:'r2',name:crypto.randomUUID()}}}}]});
  try {
    const db = await native.getD1Database('DB') as D1Database;
    for(const name of (await readdir('migrations/core')).filter(name=>name.endsWith('.sql')).sort()) {
      const statements = sqlStatements(await readFile(`migrations/core/${name}`,'utf8'));
      if(statements.length) await db.batch(statements.map(statement=>db.prepare(statement)));
    }
    const jobs: unknown[] = [];
    const env = {DB:db,ASSETS_BUCKET:await native.getR2Bucket('ASSETS_BUCKET'),MANGO_JOBS:{async send(job:unknown){jobs.push(job)}},MANGO_PUBLIC_BASE_URL:'http://127.0.0.1',INITIAL_OPERATOR_EMAILS:'owner@example.test'} as unknown as AppBindings;
    const platform = createFixturePlatform(env,'proposal-fixture-signing-authority-at-least-thirty-two');
    platform.commerce=proposalCommerce();
    const verification=fixtureVerification(db,platform.config);
    platform.mailer={channel:'email',async capabilities(){return {configured:true,canSendMarketing:true,effectiveDeduplication:true,effectiveReconciliation:true,deduplicationWindowMs:86400000,reconciliationWindowMs:86400000,detail:'Test transport'}},inspectSender:sender=>verification.inspect(sender),async validateSender(){return {ready:true,detail:'Test transport'}},async send(){throw new Error('No proposal test sends')},async reconcile(){return {facts:[],exhausted:true}},async verifyWebhook(){throw new Error('No webhook')}};
    const {ai,controls}=proposalGenerationEdge(platform.config.mailSender);
    platform.ai=ai;
    const services=createAppServices(platform);
    const identity=testIdentity(platform);
    await identity.importLocalDemoOperator({id:'proposal-operator',email:'owner@example.test',displayName:'Owner'},new Date());
    const session=await identity.createTestSession('proposal-operator');
    // A colleague whose role reads campaigns without unmasked contact access.
    await identity.importLocalDemoOperator({id:'proposal-analyst',email:'analyst@example.test',displayName:'Analyst'},new Date());
    await db.prepare("INSERT INTO operator_product_roles(operator_id,role,unmasked_contacts,updated_by,updated_at) VALUES('proposal-analyst','analyst',0,'proposal-operator',?)").bind(Date.now()).run();
    const analyst=await identity.createTestSession('proposal-analyst');
    for(const name of ['first','second','excluded']) await services.audienceService.captureConsent({idempotencyKey:`proposal-${name}`,contact:{email:`${name}@example.test`,displayName:name},channel:'email',brandOrLegalSender:platform.config.mailSender.displayName,messageCategory:'newsletter',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',captureMethod:'test-fixture',captureSource:'decision-test',consentText:'Receive newsletter',consentVersion:'v1',occurredAt:new Date(),confirmationRequired:false});
    await services.audienceService.recordChannelOptOut({channel:'email',destination:'excluded@example.test',occurredAt:new Date(),reason:'fixture-optout'});
    await synchronizeProposalSource(services);
    const app=createApp(env,platform,undefined,true);
    const call=async(path:string,body?:unknown,authenticated=true,method=body===undefined?'GET':'POST',token=session.token)=>{
      const response=await app.fetch(new Request(`http://127.0.0.1${path}`,{method,headers:{'Content-Type':'application/json',...(authenticated?{Cookie:`${localSessionCookieName('http://127.0.0.1')}=${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
      return {status:response.status,body:await response.json() as any};
    };
    return {db,platform,services,controls,jobs,call,analyst:(path:string)=>call(path,undefined,true,'GET',analyst.token),close:()=>native.dispose()};
  }catch(error){await native.dispose();throw error;}
}

export type DecisionRuntime=Awaited<ReturnType<typeof decisionRuntime>>;

export async function generated(runtime:DecisionRuntime) {
  const result=await runtime.call('/api/proposals/generate',{});
  if(result.status!==201)throw new Error(`Generation did not succeed: ${JSON.stringify(result.body)}`);
  return result.body as {proposalId:string;campaignId:string;revisionId:string};
}
