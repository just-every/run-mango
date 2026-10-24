import {z} from 'zod';
import type {Platform} from '@/core/shared/platform';
import type {ImportPlan} from '@/vendor/base/import-kit/src/types';
import type {NormalizedImportRow} from '../audience/import-normalize';
import {writeContent,undoContent} from './archive-drafts';
import {importHtml} from './html-import';
import {htmlToText} from '../campaigns/authoring-content';
import {sha256} from '@/core/shared/ids';
export const sourceExtrasSchema=z.object({notes:z.array(z.string().max(5000)).max(1000),templates:z.array(z.object({name:z.string().min(1).max(200),html:z.string().max(500000)}).strict()).max(100),segments:z.array(z.object({name:z.string().min(1).max(140),conditions:z.string().max(10000)}).strict()).max(100),history:z.array(z.object({email:z.string().email(),kind:z.enum(['order','click','open','event']),occurredAt:z.string().datetime({offset:true}),data:z.record(z.string(),z.unknown())}).strict()).max(5000)}).strict();
export const extrasOf=(plan:ImportPlan)=>plan.entries.flatMap(e=>{const row=e.source.payload as unknown as NormalizedImportRow;return row.sourceExtras?[row.sourceExtras]:[];})[0];
export async function applySourceExtras(platform:Platform,plan:ImportPlan,operatorId:string){
  const extras=extrasOf(plan);if(!extras)return;
  const archiveId='csv:'+plan.fingerprint;
  for(const [ordinal,template] of extras.templates.entries()){
    const html=importHtml(template.html);
    if(!htmlToText(html.html).trim())continue;
    await writeContent(platform,archiveId,{ordinal,kind:'draft',sourcePath:`templates/${ordinal}.html`,sourceRow:null,title:template.name,subject:'',sentAt:'',html:html.html,text:htmlToText(html.html),removed:html.removed,flagged:html.flagged,mergeTags:html.mergeTags,contentPaths:[]},operatorId);
  }
  const now=Date.now(),db=platform.database.$client;
  for(const segment of extras.segments){
    const id=await sha256('source-segment:'+plan.fingerprint+':'+segment.name),rule={version:1,operator:'all',predicates:[{sourceType:'contact',field:'property',property:'imported-topic:'+segment.name,comparator:'eq',value:true}]};
    await db.prepare("INSERT INTO audience_segments(id,name,inclusion_rule_json,exclusion_rules_json,created_by,created_at,updated_at) VALUES(?,?,?,'[]',?,?,?) ON CONFLICT(id) DO NOTHING").bind(id,('Imported snapshot · '+segment.name).slice(0,160),JSON.stringify(rule),operatorId,now,now).run();
  }
}
export async function undoSourceExtras(platform:Platform,plan:ImportPlan){
  if(!extrasOf(plan))return;
  const db=platform.database.$client;
  const rows=(await db.prepare("SELECT * FROM move_in_content WHERE archive_id=? AND state='imported'").bind('csv:'+plan.fingerprint).all<{id:string;kind:string;campaign_id:string|null;revision_id:string|null;revision_updated_at:number|null}>()).results;
  for(const row of rows)await undoContent(db,row);
  for(const segment of extrasOf(plan)!.segments)await db.prepare('DELETE FROM audience_segments WHERE id=? AND updated_at=created_at').bind(await sha256('source-segment:'+plan.fingerprint+':'+segment.name)).run();
}
