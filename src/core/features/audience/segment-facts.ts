import { readContactRfm } from '@/core/features/insights/retention';

/** Real local facts shared by the rule resolver, with no provider inference. */
export function createSegmentFacts(db:D1Database) {
  return {
    segmentRfm:(now:Date)=>readContactRfm(db,now),
    async segmentProfile(contactId:string) {
      const row=await db.prepare('SELECT fields_json fields,tags_json tags FROM integration_contact_profiles WHERE contact_id=?').bind(contactId).first<{fields:string;tags:string}>();
      const imported=(await db.prepare("SELECT detail FROM contact_history WHERE contact_id=? AND kind='incumbent-profile' ORDER BY occurred_at,id").bind(contactId).all<{detail:string}>()).results;
      const fields:Record<string,unknown>={},tags=new Set<string>();
      for(const record of imported){const profile=JSON.parse(record.detail);Object.assign(fields,profile.fields,{importedTopics:profile.topics});for(const tag of profile.tags)tags.add(tag);}
      if(row){Object.assign(fields,JSON.parse(row.fields));for(const tag of JSON.parse(row.tags))tags.add(tag);}
      return {fields,tags:[...tags].sort()};
    },
    async segmentClicked(contactId:string,channel:'email'|'sms',from:Date,now:Date) {
      const native=await db.prepare(`SELECT 1 FROM link_click_facts c JOIN recipient_steps r ON r.id=c.recipient_step_id
        WHERE r.contact_id=? AND r.channel=? AND c.automated=0 AND c.occurred_at>=? AND c.occurred_at<=? LIMIT 1`).bind(contactId,channel,from.getTime(),now.getTime()).first();
      if(native)return true;
      if(channel!=='email')return false;
      return Boolean(await db.prepare(`SELECT 1 FROM imported_engagement_facts f JOIN move_in_archives a ON a.id=f.archive_id
        WHERE f.contact_id=? AND f.kind='click' AND a.state='applied' AND f.occurred_at>=? AND f.occurred_at<=? LIMIT 1`).bind(contactId,from.getTime(),now.getTime()).first());
    },
    async segmentPaid(contactId:string) {
      return Boolean(await db.prepare("SELECT 1 FROM paid_subscriptions WHERE contact_id=? AND state='active' LIMIT 1").bind(contactId).first());
    },
    async segmentCatalogProduct(productId:string) {
      const row=await db.prepare("SELECT payload FROM source_records WHERE source_type='product' AND provider_source_id=? ORDER BY updated_at DESC LIMIT 1").bind(productId).first<{payload:string}>();
      return row?JSON.parse(row.payload) as Record<string,unknown>:undefined;
    },
    async segmentCatalogCoverage(field:'boughtCollectionId'|'boughtCategory') {
      const path=field==='boughtCollectionId'?'$.collectionIds':'$.category';
      // An attribute the source never recorded is unavailable, never an empty
      // purchase set. A recorded null (an uncategorized product) is a fact.
      const row=await db.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN json_type(payload,?) IS NOT NULL THEN 1 ELSE 0 END) covered
        FROM source_records WHERE source_type='product'`).bind(path).first<{total:number;covered:number|null}>();
      return Boolean(row?.total&&row.covered===row.total);
    },
  };
}
