import { readContactRfm } from '@/core/features/insights/retention';

/** Real local facts shared by the rule resolver, with no provider inference. */
export function createSegmentFacts(db:D1Database) {
  return {
    segmentRfm:(now:Date)=>readContactRfm(db,now),
    async segmentProfile(contactId:string) {
      const row=await db.prepare('SELECT fields_json fields,tags_json tags FROM integration_contact_profiles WHERE contact_id=?').bind(contactId).first<{fields:string;tags:string}>();
      return row?{fields:JSON.parse(row.fields) as Record<string,unknown>,tags:JSON.parse(row.tags) as string[]}:{fields:{},tags:[]};
    },
    async segmentClicked(contactId:string,channel:'email'|'sms',from:Date,now:Date) {
      const native=await db.prepare(`SELECT 1 FROM link_click_facts c JOIN recipient_steps r ON r.id=c.recipient_step_id
        WHERE r.contact_id=? AND r.channel=? AND c.automated=0 AND c.occurred_at>=? AND c.occurred_at<=? LIMIT 1`).bind(contactId,channel,from.getTime(),now.getTime()).first();
      if(native)return true;
      if(channel!=='email')return false;
      return Boolean(await db.prepare(`SELECT 1 FROM imported_engagement_facts f JOIN move_in_archives a ON a.id=f.archive_id
        WHERE f.contact_id=? AND f.kind='click' AND a.state='applied' AND f.occurred_at>=? AND f.occurred_at<=? LIMIT 1`).bind(contactId,from.getTime(),now.getTime()).first());
    },
    async segmentCatalogProduct(productId:string) {
      const row=await db.prepare("SELECT payload FROM source_records WHERE source_type='product' AND provider_source_id=? ORDER BY updated_at DESC LIMIT 1").bind(productId).first<{payload:string}>();
      return row?JSON.parse(row.payload) as Record<string,unknown>:undefined;
    },
    async segmentCatalogCoverage(field:'boughtCollectionId'|'boughtCategory') {
      const path=field==='boughtCollectionId'?'$.collectionIds':'$.category';
      // A missing catalog attribute is unavailable, never an empty purchase set.
      const row=await db.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN json_type(payload,?) IS NOT NULL AND json_type(payload,?)<>'null' THEN 1 ELSE 0 END) covered
        FROM source_records WHERE source_type='product'`).bind(path,path).first<{total:number;covered:number|null}>();
      return Boolean(row?.total&&row.covered===row.total);
    },
  };
}
