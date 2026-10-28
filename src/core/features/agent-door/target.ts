import type {NativeTarget} from '@/vendor/base/agent-door/types.ts';
import type {Platform} from '@/core/shared/platform';

/** Only current native IDs enter the audit. Creation has no ID before admission. */
export async function nativeTarget(platform:Platform,kind:string,args:Record<string,unknown>):Promise<NativeTarget|null>{
  const db=platform.database.$client;
  const family=kind.split('.')[0];
  if(typeof args.revisionId==='string'){
    const row=await db.prepare('SELECT id FROM campaign_revisions WHERE id=?').bind(args.revisionId).first<{id:string}>();
    return row?{kind:'campaign-revision',id:row.id}:null;
  }
  if(typeof args.id!=='string')return null;
  const tables:Record<string,{table:string;kind:string}>={
    campaigns:{table:'campaigns',kind:'campaign'},publications:{table:'campaigns',kind:'campaign'},
    contacts:{table:'contacts',kind:'contact'},segments:{table:'audience_segments',kind:'segment'},
    templates:{table:'campaign_templates',kind:'template'},blocks:{table:'reusable_email_blocks',kind:'block'},
    designs:{table:kind==='designs.read'||kind==='designs.start'?'campaigns':'design_jobs',kind:kind==='designs.read'||kind==='designs.start'?'campaign':'design'},
    access:{table:'oa_operators',kind:'operator'},proposals:{table:'proposals',kind:'proposal'},
  };
  const selected=tables[family];if(!selected)return null;
  const row=await db.prepare(`SELECT id FROM ${selected.table} WHERE id=?`).bind(args.id).first<{id:string}>();
  return row?{kind:selected.kind,id:row.id}:null;
}
