import {IntegrationError} from '../integrations/schema';
import type {LifecycleRuntime} from '../lifecycle/types';
import {evaluateAudience} from '../lifecycle/evaluate-audience';
import {createLifecycleRepository} from '../lifecycle/repository';
import {resourceLink} from './resource-links';
import type {createIntegrationService} from '../integrations/service';
import {projectPrivateResponse,contactPrivacyRole} from '../auth/response-privacy';
import {fingerprint} from './digest';
import {witnessTool} from './witness';
import {mangoResources} from './resources';
import operations from './operations.ts';
import { ToolRefusal, type ToolDefinition, type ToolContext, type ClassAndFacts, type ClassId, type JsonSchemaObject } from '@/vendor/base/agent-door/index.ts';
import type { Platform } from '@/core/shared/platform';
import { hasPermission, productRoles } from '../auth/permissions';
import { nativeOperator } from './native';
import { activityStatement } from '../auth/activity-record';
import { agentAction } from './context';

type Args = Record<string, unknown>;
type Gateway = (ctx: ToolContext, method: string, path: string, body?: unknown) => Promise<unknown>;
const id = (value: unknown) => encodeURIComponent(String(value));
const object = (value: unknown): Args => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Args : {};
const standard = (): ClassAndFacts[] => [{class: 'standard', facts: {measure: 1}}];

async function authority(platform: Platform, kind: string, args: Args) {
  const db = platform.database.$client;
  if (kind === 'access.update') {
    const target = await db.prepare('SELECT id FROM oa_operators WHERE id=?').bind(args.id).first<{id:string}>();
    if (!target) throw new ToolRefusal('not_found');
    const before = await nativeOperator(platform, target.id);
    const after = String(args.role) as typeof productRoles[number];
    const capabilities = ['campaign.read','draft.write','campaign.approve','campaign.send','campaign.test','flow.activate',
      'contact.read','contact.unmasked','contact.subscribe','contact.optout','contact.erase','segment.manage','form.manage',
      'integration.manage','activity.read','operators.manage','settings.manage','provider.connect','installation.erase'] as const;
    const widens = capabilities.some(capability => hasPermission(after,capability) && !hasPermission(before.role,capability))
      || args.unmaskedContacts === true && !before.unmaskedContacts && before.role==='analyst';
    return {subject:target.id, widens};
  }
  if (kind === 'connections.update') return {subject: 'installation:sending', widens: true};
  if (kind === 'signup.update') {
    const before=await db.prepare("SELECT embed_origins,challenge_enabled FROM signup_settings WHERE id='newsletter'").first<{embed_origins:string;challenge_enabled:number}>();
    const next=object(args.settings),origins=JSON.parse(before?.embed_origins??'[]') as string[];
    return {subject:'public:newsletter-signup',widens:(Array.isArray(next.embedOrigins)&&next.embedOrigins.some(origin=>!origins.includes(String(origin))))||(before?.challenge_enabled!==0&&next.challengeEnabled===false)};
  }
  return null;
}

async function campaignEffect(runtime:LifecycleRuntime,args:Args){
  const repository=createLifecycleRepository(runtime.platform.database);
  const snapshot=await repository.readRevisionSnapshot(String(args.id),String(args.revisionId));
  if(!snapshot)throw new ToolRefusal('not_found');
  const evaluated=await evaluateAudience(runtime,repository,{...snapshot.revision,channels:[...new Set(snapshot.steps.map(step=>step.channel))]},new Date());
  if(evaluated.audience.status!=='ok'||evaluated.blockingEligibility.size)throw new ToolRefusal('audience_unavailable');
  const recipients=snapshot.steps.flatMap(step=>evaluated.candidates.flatMap(candidate=>candidate.channels[step.channel]?[candidate.channels[step.channel]!.destination]:[])).sort();
  return {snapshot,recipients};
}

async function classes(platform: Platform, kind: string, args: Args, ctx: ToolContext): Promise<ClassAndFacts[]> {
  const db = platform.database.$client;
  // Protected metadata actually present in a permitted contact projection.
  if (kind === 'contacts.read') {
    const operator = await nativeOperator(platform,ctx.person.id);
    const protectedRow = hasPermission(operator.role,'contact.unmasked') && await db.prepare(
      'SELECT 1 FROM consent_capture_metadata WHERE contact_id=? AND (capture_ip IS NOT NULL OR confirmation_ip IS NOT NULL) LIMIT 1').bind(args.id).first();
    return protectedRow ? [{class:'sensitive',facts:{measure:1,kind:'consent-network-evidence'}}] : standard();
  }
  if (kind === 'access.update') {
    const target = await authority(platform,kind,args);
    return [{class:'access',facts:{measure:1,direction:target?.widens?'widens':'narrows'}}];
  }
  if (kind === 'connections.update') return [
    {class:'access',facts:{measure:1,direction:'widens'}},
    {class:'security',facts:{measure:1,setting:'marketing-provider-connection'}},
    {class:'external',facts:{measure:1,counterparty:'known'}},
  ];
  if (['contacts.erase','contacts.merge','segments.delete'].includes(kind)) return [{class:'destructive',facts:{measure:1}}];
  if (kind === 'contacts.consent') {
    // This only records real supplied permission. The native service still
    // requires evidence, refuses existing restrictions, and applies opt-in mode.
    const mode = await db.prepare("SELECT mode FROM opt_in_modes WHERE point='manual'").first<{mode:string}>();
    return args.channel === 'sms' || mode?.mode !== 'single' ? [{class:'external',facts:{measure:1,counterparty:'known'}}] : standard();
  }
  if (['campaigns.pause','campaigns.resume','campaigns.cancel'].includes(kind)) {
    const record = await db.prepare('SELECT state FROM campaigns WHERE id=?').bind(args.id).first<{state:string}>();
    if (!record) throw new ToolRefusal('not_found');
    return kind === 'campaigns.cancel' && record.state === 'scheduled' && !await db.prepare('SELECT 1 FROM step_dispatches WHERE revision_id=(SELECT active_revision_id FROM campaigns WHERE id=?) AND started_at IS NOT NULL').bind(args.id).first() ? standard() : [{class:'live',facts:{measure:1,service:'newsletter-dispatch'}}];
  }
  if (kind.startsWith('flows.') && ['activate','pause'].includes(kind.split('.')[1])) return [{class:'live',facts:{measure:1,service:'woocommerce-tag-and-exit'}}];
  if(kind==='signup.update'){
    const before=await db.prepare("SELECT embed_origins,challenge_enabled FROM signup_settings WHERE id='newsletter'").first<{embed_origins:string;challenge_enabled:number}>();
    const next=object(args.settings),result:ClassAndFacts[]=[{class:'live',facts:{measure:1,service:'newsletter-signup'}}];
    if(JSON.stringify(next.embedOrigins??[])!==(before?.embed_origins??'[]'))result.push({class:'access',facts:{measure:1,direction:(await authority(platform,kind,args))?.widens?'widens':'narrows'}});
    if(next.challengeEnabled!==undefined&&next.challengeEnabled!==Boolean(before?.challenge_enabled??1))result.push({class:'security',facts:{measure:1,setting:'newsletter-signup-challenge'}});
    return result;
  }
  if (['reports.policy'].includes(kind)) return [{class:'live',facts:{measure:1,service:kind === 'signup.update'?'newsletter-signup':'report-mail-schedule'}}];
  if (kind.startsWith('publications.')) return [{class:'external',facts:{measure:1,counterparty:'public'}}];
  if (kind === 'campaigns.test_send') {
    const recipients = Array.isArray(args.to) ? args.to.map(String) : [];
    const internal = (await db.prepare("SELECT lower(email) AS email FROM oa_operators WHERE status='active'").all<{email:string}>()).results;
    return [{class:'external',facts:{measure:recipients.length,counterparty:recipients.every(to=>internal.some(row=>row.email===to.toLowerCase()))?'internal':'new'}}];
  }
  if (kind === 'assets.attach') return [{class:'external',facts:{measure:1,counterparty:'public'}}];
  if (kind === 'reports.schedule') return [{class:'external',facts:{measure:Array.isArray(args.recipients)?args.recipients.length:0,counterparty:'internal'}}];
  if (['campaigns.authorize','campaigns.reauthorize','delivery.dispatch'].includes(kind)) {
    const row = await db.prepare('SELECT eligible_count FROM campaign_audiences WHERE revision_id=?').bind(args.revisionId).first<{eligible_count:number}>();
    return [{class:'external',facts:{measure:row?.eligible_count ?? 0,counterparty:'known'}}];
  }
  if (['campaigns.refresh_checks','proposals.generate','designs.start','designs.choose','sender.verify','store.sync'].includes(kind)) return [{class:'external',facts:{measure:1,counterparty:'known'}}];
  return standard();
}

async function revision(platform: Platform, kind: string, args: Args) {
  const db = platform.database.$client;
  let record: unknown = null;
  if (kind.startsWith('campaigns.') || kind.startsWith('publications.')) record = args.revisionId
    ? await db.prepare('SELECT id,version,state,updated_at,content_digest FROM campaign_revisions WHERE id=?').bind(args.revisionId).first()
    : args.id ? await db.prepare('SELECT id,state,active_revision_id,updated_at FROM campaigns WHERE id=?').bind(args.id).first() : null;
  else if (kind.startsWith('segments.') && args.id) record = await db.prepare('SELECT * FROM audience_segments WHERE id=?').bind(args.id).first();
  else if (kind.startsWith('designs.') && args.id) record = await db.prepare('SELECT id,state,chosen_slot,updated_at FROM design_jobs WHERE id=?').bind(args.id).first();
  else if (kind === 'access.update') record = await db.prepare('SELECT n.id,n.version,n.role,r.role product_role,r.unmasked_contacts FROM oa_operators n LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=?').bind(args.id).first();
  if(record&&['campaigns.authorize','campaigns.reauthorize','campaigns.test_send'].includes(kind)){
    const evidence=await db.batch([db.prepare('SELECT generation FROM audience_source_authority WHERE id=1'),db.prepare('SELECT id,generation,binding_digest,configuration_digest,observation_id,revoked_at FROM sender_verification_state ORDER BY id')]);
    return fingerprint({record,evidence:evidence.map(value=>value.results)});
  }
  return record ? fingerprint(record) : null;
}

export function mangoTools(platform: Platform, call: Gateway, integrations: ReturnType<typeof createIntegrationService>,runtime:LifecycleRuntime): ToolDefinition[] {
  const tools: ToolDefinition[] = operations.map(operation => {
    const kind = operation.kind;
    const tool: ToolDefinition = {
      name:operation.name, title:operation.title, description:operation.title+'. Uses the current native sponsor authority and company policy.',
      scope:operation.name, readOnly:operation.readOnly,
      inputSchema:operation.inputSchema as unknown as JsonSchemaObject, outputSchema:{type:'object'},
      classes:operation.classes as ClassId[], clauses:operation.clauses, untrusted:true,
      classify:async(args,ctx)=>{
        if(['campaigns.authorize','campaigns.reauthorize'].includes(kind)){
          const effect=await campaignEffect(runtime,args);
          return [{class:'external',facts:{measure:effect.recipients.length,counterparty:'known'}}];
        }
        return classes(platform,kind,args,ctx);
      },
      ...(!operation.readOnly ? {
        revisionType:'string' as const, revision:(args: Args)=>revision(platform,kind,args),
        summary:async (args: Args) => {
          if(['campaigns.authorize','campaigns.reauthorize'].includes(kind)){
            const {snapshot,recipients}=await campaignEffect(runtime,args);
            return {target:{id:snapshot.campaign.id,name:snapshot.revision.name},recipients,
              items:[snapshot.revision.id,snapshot.revision.emailSubject,snapshot.revision.emailBody,snapshot.revision.emailText,JSON.stringify(snapshot.steps)]};
          }
          const current = args.revisionId ? await platform.database.$client.prepare('SELECT name,email_subject FROM campaign_revisions WHERE id=?').bind(args.revisionId).first<{name:string;email_subject:string}>() : null;
          return {target:{...(args.id ? {id:String(args.id)} : {}),name:current?.name ?? operation.title},
            items:[...(current?[current.email_subject]:[]),JSON.stringify(args)],
            ...(Array.isArray(args.to)?{recipients:args.to.map(String)}:{}),
            ...(Array.isArray(args.recipients)?{recipients:args.recipients.map(String)}:{}),
            ...(args.role?{role:String(args.role)}:{})};
        },
      } : {}),
      ...(operation.classes.some(cls=>cls==='access'||cls==='security') ? {authority:(args: Args)=>authority(platform,kind,args)} : {}),
      async run(args,ctx) {
        if(ctx.agent.id==='integration:'+ctx.clientId&&['audience.read','segments.read'].includes(kind)){
          const operator=await nativeOperator(platform,ctx.person.id);
          if(!hasPermission(operator.role,kind==='audience.read'?'contact.read':'segment.read'))throw new ToolRefusal('role_forbidden');
          const result=kind==='audience.read'?await integrations.contacts.list(ctx.clientId!,{limit:100}):await integrations.contacts.segments(ctx.clientId!);
          return {result:projectPrivateResponse(contactPrivacyRole(operator),operation.path,result)};
        }
        let path = operation.path;
        const body: Args = {...args};
        for (const match of path.matchAll(/\{([^}]+)\}/g)) {path=path.replace(match[0],id(args[match[1]]));delete body[match[1]];}
        const option = operation as typeof operation & {query?:boolean;unwrap?:string};
        if (option.query) {
          const query=new URLSearchParams(Object.entries(body).map(([key,value])=>[key,String(value)]));
          path += '?'+query;
        }
        if (kind === 'campaigns.authorize' || kind === 'campaigns.reauthorize') body.idempotencyKey='agent-native:'+crypto.randomUUID();
        const design=kind==='designs.read'?await platform.database.$client.prepare('SELECT id FROM design_jobs WHERE campaign_id=? ORDER BY created_at DESC LIMIT 1').bind(args.id).first<{id:string}>():null;
        if(kind==='designs.read'&&!design)return {result:{enabled:Boolean(platform.design),earlier:[]}};
        const pureResource = kind === 'sender.read' ? 'mango://sender/readiness' : design?'mango://designs/'+encodeURIComponent(design.id):null;
        const read = pureResource ? await mangoResources(platform).find(resource=>resource.uriTemplate===(design?'mango://designs/{id}':pureResource))?.read(pureResource,{...ctx,clientId:ctx.clientId}) : null;
        const result = read ? object(read.json) : await call(ctx,operation.method,path,operation.readOnly?undefined:option.unwrap?body[option.unwrap]:body);
        if (!operation.readOnly) {
          const uri=await resourceLink(platform,kind,args,result);
          const family=kind.split('.')[0];
          const target=uri?.split('/').at(-1)??'installation';
          await agentAction.run(ctx,()=>activityStatement(platform.database.$client,{key:crypto.randomUUID(),action:operation.name,entityType:family,entityId:target,actorId:ctx.person.id}).run());
          if(uri)ctx.emit(family+'.changed',uri,{tool:operation.name});
          return {result,...(uri?{resources:[{uri,name:operation.title}]}:{})};
        }
        return {result};
      },
    };
    return tool;
  });
  return [...tools,witnessTool(platform),{
    name:'mango.campaigns.enqueue',title:'Queue an authorized campaign',description:'Queue an exact natively authorized revision for a retained integration segment; no approval or consent is granted.',
    scope:'mango.campaigns.enqueue',readOnly:false,classes:['external'],clauses:['CAMP-004','AUD-005','SEND-001'],
    inputSchema:{type:'object',properties:{id:{type:'string'},revisionId:{type:'string'},segmentId:{type:'string'}},required:['id','revisionId','segmentId'],additionalProperties:false},
    outputSchema:{type:'object'},classify:(args,ctx)=>classes(platform,'delivery.dispatch',args,ctx),
    summary:args=>({target:{id:String(args.id)},items:[String(args.revisionId),String(args.segmentId)]}),
    async run(args,ctx){
      if(!ctx.clientId||ctx.agent.id!=='integration:'+ctx.clientId)throw new ToolRefusal('native_client_required');
      const operator=await nativeOperator(platform,ctx.person.id);
      if(!hasPermission(operator.role,'campaign.send'))throw new ToolRefusal('role_forbidden');
      try{
        const result=await agentAction.run(ctx,()=>integrations.send(ctx.clientId!,String(args.id),{revisionId:String(args.revisionId),segmentId:String(args.segmentId)}));
        return {result};
      }catch(error){if(error instanceof IntegrationError)throw new ToolRefusal(error.code,'Native integration refused',{status:error.status});throw error;}
    },
  }];

}
