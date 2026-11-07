import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthVariables} from '@/core/features/auth/routes';
import type {Platform} from '@/core/shared/platform';
import {hasPermission,type Capability} from '@/core/features/auth/permissions';
import {contactPrivacyRole} from '@/core/features/auth/response-privacy';
import {readJson} from '@/core/api/input';
import {encodeCsv} from '../csv';
import {actionParams,bulkActions,type BulkAction} from './actions';
import {restrictedFilter,searchFilters,type SearchFilters} from './filters';
import {advanceBulkJob,bulkJobAction,createBulkJob,exportRows,readBulkReceipt,recentBulkJobs,reopenBulkJob,type Selection} from './jobs';
import {prepareSearch,SearchRefusal} from './search';

/** Beyond the route's segment permission, each action needs the authority of its own domain. */
const actionAuthority:Record<BulkAction,Capability|undefined>={tag:undefined,untag:undefined,export:'audience.export',suppress:'contact.optout',erase:'contact.erase','add-to-topic':'contact.subscribe'};
const request=z.object({
  action:z.enum(bulkActions),
  params:z.record(z.string(),z.unknown()).default({}),
  selection:z.union([z.object({contactIds:z.array(z.string().min(1).max(200)).min(1).max(5000)}).strict(),z.object({search:searchFilters}).strict()]),
  // The count the operator saw; destructive actions refuse without it.
  confirmTotal:z.number().int().positive().optional(),
}).strict();
const flat=z.object({
  q:z.string().optional(),email:z.string().optional(),phone:z.string().optional(),name:z.string().optional(),tag:z.string().optional(),segmentId:z.string().optional(),
  propertyKey:z.string().optional(),propertyValue:z.string().optional(),consentChannel:z.string().optional(),consentState:z.string().optional(),
  cursor:z.string().max(64).optional(),limit:z.coerce.number().int().min(1).max(100).default(50),
});

export function createBulkRoutes(platform:Platform) {
  const routes=new Hono<{Variables:AuthVariables}>();
  const unmasked=(operator:AuthVariables['operator'])=>hasPermission(contactPrivacyRole(operator),'contact.unmasked');
  const refuse=(error:unknown,context:{json:(body:unknown,status:never)=>Response})=>{
    if(error instanceof SearchRefusal)return context.json({error:error.code,detail:error.message},error.status as never);
    throw error;
  };

  routes.get('/audience/search',async context=>{
    const query=flat.safeParse(context.req.query());
    if(!query.success)return context.json({error:'invalid_search'},400);
    const {propertyKey,propertyValue,consentChannel,consentState,cursor,limit,...rest}=query.data;
    const candidate=searchFilters.safeParse({...Object.fromEntries(Object.entries(rest).filter(([,value])=>value!==undefined&&value!=='')),
      ...propertyKey?{property:{key:propertyKey,value:propertyValue??''}}:{},...consentChannel||consentState?{consent:{channel:consentChannel,state:consentState}}:{}});
    if(!candidate.success)return context.json({error:'invalid_search',detail:'Check the search fields.'},400);
    const operator=context.get('operator'),open=unmasked(operator);
    const blocked=restrictedFilter(candidate.data,open);
    if(blocked)return context.json({error:'search_restricted',detail:`Your role can search by a full email address, a full phone number or consent state, not by ${blocked}.`},403);
    try{
      const search=await prepareSearch(platform.database,candidate.data,!open);
      const [page,total]=await Promise.all([search.page(cursor??'',limit),cursor?undefined:search.total()]);
      return context.json({contacts:page.contacts,nextCursor:page.nextCursor,total:total??null});
    }catch(error){return refuse(error,context as never);}
  });

  routes.post('/audience/bulk',async context=>{
    const parsed=await readJson(context,request);if('error' in parsed)return parsed.error;
    const {action,selection,confirmTotal}=parsed.data,operator=context.get('operator'),role=contactPrivacyRole(operator);
    const needed=actionAuthority[action];
    if(needed&&!hasPermission(role,needed))return context.json({error:'forbidden',detail:'Your role cannot run this bulk action.'},403);
    const params=actionParams[action].safeParse(parsed.data.params);
    if(!params.success)return context.json({error:'invalid_params',detail:'Check the tag or topic name.'},400);
    if((action==='erase'||action==='suppress')&&confirmTotal===undefined)return context.json({error:'confirm_total_required',detail:'Confirm the number of contacts this action will change.'},400);
    try{
      let chosen:Selection;
      if('contactIds' in selection)chosen={kind:'ids',contactIds:selection.contactIds};
      else chosen={kind:'search',search:await prepareSearch(platform.database,selection.search as SearchFilters,false)};
      const receipt=await createBulkJob(platform,{action,params:params.data as Record<string,string>,selection:chosen,actorId:operator.id,confirmTotal});
      if(receipt.state==='running'&&!platform.config.local)await platform.jobs.enqueue({kind:'contact.bulk',idempotencyKey:`bulk:${receipt.id}:${crypto.randomUUID()}`,payload:{jobId:receipt.id}});
      return context.json({receipt},receipt.state==='running'?202:200);
    }catch(error){return refuse(error,context as never);}
  });

  routes.get('/audience/bulk',async context=>context.json({jobs:await recentBulkJobs(platform)}));
  routes.get('/audience/bulk/:id',async context=>{
    const after=Number(context.req.query('refusedAfter')??-1),limit=Number(context.req.query('refusedLimit')??200);
    const receipt=await readBulkReceipt(platform,context.req.param('id'),{after:Number.isFinite(after)?after:-1,limit:Number.isFinite(limit)?limit:200});
    return receipt?context.json({receipt}):context.json({error:'not_found'},404);
  });
  routes.post('/audience/bulk/:id/resume',async context=>{
    const id=context.req.param('id'),action=await bulkJobAction(platform,id);
    if(!action)return context.json({error:'not_found'},404);
    const needed=actionAuthority[action];
    if(needed&&!hasPermission(contactPrivacyRole(context.get('operator')),needed))return context.json({error:'forbidden',detail:'Your role cannot continue this bulk action.'},403);
    await reopenBulkJob(platform,id);
    const outcome=await advanceBulkJob(platform,id);
    const receipt=(await readBulkReceipt(platform,id))!;
    return context.json({receipt,waiting:outcome.waiting},receipt.state==='running'?202:200);
  });
  routes.get('/audience/bulk/:id/export',async context=>{
    const receipt=await readBulkReceipt(platform,context.req.param('id'),{limit:1});
    if(!receipt)return context.json({error:'not_found'},404);
    if(receipt.action!=='export')return context.json({error:'not_an_export',detail:'Only an export job has a file.'},409);
    if(receipt.state!=='complete')return context.json({error:'export_not_ready',detail:'The export is still running.'},409);
    const rows=await exportRows(platform,receipt.id);
    const csv=encodeCsv([['contact_id','name','emails','phones','email_status','sms_status','tags'],...rows.map(row=>[row.id,row.name,row.emails,row.phones,row.emailStatus,row.smsStatus,row.tags])]);
    return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="contacts-${receipt.id}.csv"`,'Cache-Control':'no-store'}});
  });
  return routes;
}
