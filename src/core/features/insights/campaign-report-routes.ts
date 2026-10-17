import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '@/core/features/auth/routes';
import type { Database } from '@/core/platform/db/client';
import { readJson } from '@/core/api/input';
import { ulid } from '@/core/shared/ids';
import { campaignEngagement, campaignEngagementCsv } from './campaign-engagement';
import { campaignLinkClickers, campaignLinkClickersCsv, campaignLinkClickerSegment } from './campaign-engagement-clickers';
import { campaignRecipientOutcomes, campaignRecipientReport, campaignRecipientCsvResponse } from './campaign-recipient-report';
import { campaignReportCsvResponse } from './campaign-recipient-csv';

const querySchema=z.object({revisionId:z.string().min(1).optional(),stepId:z.string().min(1).optional(),outcome:z.enum(campaignRecipientOutcomes).optional(),reason:z.string().optional(),offset:z.coerce.number().int().min(0).optional(),limit:z.coerce.number().int().min(1).max(1000).optional(),format:z.enum(['csv']).optional(),destinationUrl:z.string().max(2000).optional()}).strict();
export function createCampaignReportRoutes(database:Database) {
  const routes=new Hono<{Variables:AuthVariables}>();
  const revision=async(id:string,requested?:string)=>requested ?? (await database.$client.prepare('SELECT active_revision_id id FROM campaigns WHERE id=?').bind(id).first<{id:string}>())?.id;
  routes.get('/campaigns/:id/engagement',async context=>{
    const query=querySchema.safeParse(context.req.query());if(!query.success)return context.json({error:'invalid_report_filter'},400);
    const id=context.req.param('id'),rev=await revision(id,query.data.revisionId);if(!rev)return context.json({error:'not_found'},404);
    const report=await campaignEngagement(database,id,rev);if(!report)return context.json({error:'not_found'},404);
    return query.data.format==='csv'?campaignReportCsvResponse(campaignEngagementCsv(report),'campaign-links.csv'):context.json(report);
  });
  routes.get('/campaigns/:id/clickers',async context=>{
    const query=querySchema.safeParse(context.req.query());if(!query.success||!query.data.destinationUrl)return context.json({error:'invalid_report_filter'},400);
    const id=context.req.param('id'),rev=await revision(id,query.data.revisionId);if(!rev)return context.json({error:'not_found'},404);
    const report=await campaignLinkClickers(database,id,rev,{destinationUrl:query.data.destinationUrl});if(!report)return context.json({error:'link_not_found'},404);
    return query.data.format==='csv'?campaignReportCsvResponse(campaignLinkClickersCsv(report),'campaign-clickers.csv'):context.json(report);
  });
  routes.get('/campaigns/:id/recipients',async context=>{
    const query=querySchema.safeParse(context.req.query());if(!query.success)return context.json({error:'invalid_report_filter'},400);
    const id=context.req.param('id'),rev=await revision(id,query.data.revisionId);if(!rev)return context.json({error:'not_found'},404);
    const report=query.data.format==='csv'?await campaignRecipientCsvResponse(database,id,rev,query.data):await campaignRecipientReport(database,id,rev,query.data);
    return !report?context.json({error:'not_found'},404):report instanceof Response?report:context.json(report);
  });
  routes.post('/campaigns/:id/report-segment',async context=>{
    const body=await readJson(context,z.object({name:z.string().trim().min(1).max(160),revisionId:z.string().min(1),destinationUrl:z.string().max(2000).optional(),outcome:z.enum(campaignRecipientOutcomes).optional(),stepId:z.string().optional(),reason:z.string().optional()}).strict());if('error' in body)return body.error;
    const input=body.data,id=context.req.param('id');let rule:{inclusionRuleJson:string;exclusionRulesJson:string}|null=null;
    if(input.destinationUrl) {
      const clickers=await campaignLinkClickers(database,id,input.revisionId,{destinationUrl:input.destinationUrl});if(!clickers)return context.json({error:'not_found'},404);
      rule=campaignLinkClickerSegment(clickers);
    } else {
      const ids=new Set<string>();let offset=0;
      for(;;) {
        const page=await campaignRecipientReport(database,id,input.revisionId,{...input,offset,limit:1000});if(!page)return context.json({error:'not_found'},404);
        for(const row of page.rows)if(row.contactId)ids.add(row.contactId);
        if(ids.size>1000)return context.json({error:'segment_snapshot_too_large',detail:'Use the CSV export. This audience exceeds the current saved-rule capacity.'},422);
        offset+=page.rows.length;if(page.rows.length<1000)break;
      }
      if(ids.size)rule={inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'id',comparator:'in',value:[...ids]}]}),exclusionRulesJson:'[]'};
    }
    if(!rule)return context.json({error:'no_identified_contacts'},409);
    if(rule.inclusionRuleJson.length>20000)return context.json({error:'segment_snapshot_too_large',detail:'Use the CSV export. This audience exceeds the current saved-rule capacity.'},422);
    const segmentId=ulid(),now=Date.now();
    await database.$client.prepare('INSERT INTO audience_segments (id,name,inclusion_rule_json,exclusion_rules_json,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(segmentId,input.name,rule.inclusionRuleJson,rule.exclusionRulesJson,context.get('operator').id,now,now).run();
    return context.json({id:segmentId,name:input.name,...rule},201);
  });
  return routes;
}
