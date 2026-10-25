/** Recipient restrictions are consent-history facts. Existing merge, erasure and
 * portability paths already retain/move/remove this ledger with the contact. */
export async function readPreferenceFacts(db:D1Database,contactId:string,now:Date) {
  const rows=(await db.prepare(`SELECT kind,json_extract(detail,'$.topicId') topicId,
    MAX(CAST(json_extract(detail,'$.pauseUntil') AS INTEGER)) pauseUntil
    FROM contact_history WHERE contact_id=? AND kind IN ('preference-topic-withdrawal','preference-pause')
    GROUP BY kind,json_extract(detail,'$.topicId')`).bind(contactId).all<{kind:string;topicId:string|null;pauseUntil:number|null}>()).results;
  return {withdrawnTopics:rows.flatMap(row=>row.kind==='preference-topic-withdrawal'&&row.topicId?[row.topicId]:[]),
    pauseUntil:Math.max(0,...rows.map(row=>(row.pauseUntil??0)>now.getTime()?row.pauseUntil!:0))};
}

/** Cache absence only behind the same authority generation the hand-off fences.
 * A recipient POST advances it atomically with the new restriction. */
export function preferenceFactsReader(db:D1Database) {
  let cached:{generation:number;exists:Promise<boolean>}|undefined;
  return async(contactId:string,now:Date,generation:number)=>{
    if(cached?.generation!==generation)cached={generation,exists:db.prepare("SELECT 1 FROM contact_history WHERE kind IN ('preference-topic-withdrawal','preference-pause') LIMIT 1").first().then(Boolean)};
    if(!await cached.exists)return {withdrawnTopics:[] as string[],pauseUntil:0};
    return readPreferenceFacts(db,contactId,now);
  };
}
