import type {Database} from '@/core/platform/db/client';
import type {Channel} from '@/core/shared/platform';
import {ulid} from '@/core/shared/ids';

export function outageRepository(database:Database) {
  const db=database.$client;
  return {
    async recordProviderFailure(adapter:string,channel:Channel,detail:string,now:Date,unavailable=false) {
      const time=now.getTime();
      // The transition and its complete operator/campaign consequences share
      // one transaction. Recovery cannot slip between pause and notice capture.
      await db.batch([
        db.prepare(`INSERT INTO provider_outages(id,adapter,channel,state,first_failure_at,last_error,created_at,updated_at)
          VALUES(?,?,?,'observing',?,?,?,?) ON CONFLICT DO NOTHING`).bind(ulid(time),adapter,channel,time,detail,time,time),
        db.prepare(`UPDATE provider_outages SET state=CASE WHEN ? OR first_failure_at<=? THEN 'paused' ELSE state END,
          paused_at=CASE WHEN ? OR first_failure_at<=? THEN COALESCE(paused_at,?) ELSE paused_at END,last_error=?,updated_at=?
          WHERE adapter=? AND channel=? AND state IN ('observing','paused')`)
          .bind(unavailable?1:0,time-300000,unavailable?1:0,time-300000,time,detail,time,adapter,channel),
        db.prepare(`UPDATE provider_outages SET next_probe_at=(SELECT next_probe_at FROM provider_health h WHERE h.adapter=provider_outages.adapter AND h.channel=provider_outages.channel)
          WHERE adapter=? AND channel=? AND state IN ('observing','paused')`).bind(adapter,channel),
        db.prepare(`INSERT INTO campaign_channel_pauses(id,campaign_id,revision_id,channel,reason,detail,paused_at,resume_check_at,created_at,updated_at)
          SELECT c.id||':'||c.active_revision_id||':'||?||':provider-outage',c.id,c.active_revision_id,?,'provider-outage',?,?,?, ?,?
          FROM campaigns c WHERE c.state IN ('scheduled','dispatching','paused')
          AND EXISTS(SELECT 1 FROM recipient_steps r WHERE r.campaign_id=c.id AND r.revision_id=c.active_revision_id AND r.channel=? AND r.transport_disposition='queued')
          AND EXISTS(SELECT 1 FROM provider_outages o WHERE o.adapter=? AND o.channel=? AND o.state='paused')
          ON CONFLICT(campaign_id,revision_id,channel,reason) DO UPDATE SET detail=excluded.detail,resumed_at=NULL,updated_at=excluded.updated_at`)
          .bind(channel,channel,detail,time,time,time,time,channel,adapter,channel),
        db.prepare(`INSERT INTO provider_outage_notifications(outage_id,operator_id,state,request_json,updated_at)
          SELECT o.id,u.id,'pending','null',? FROM provider_outages o CROSS JOIN oa_operators u
          WHERE o.adapter=? AND o.channel=? AND o.state='paused' AND u.status='active' ON CONFLICT DO NOTHING`)
          .bind(time,adapter,channel),
      ]);
      return {paused:Boolean(await this.channelOutage(adapter,channel))};
    },
    async channelOutage(adapter:string,channel:Channel) {
      const row=await db.prepare("SELECT id,last_error FROM provider_outages WHERE adapter=? AND channel=? AND state='paused'").bind(adapter,channel).first<{id:string;last_error:string}>();
      return row?{id:row.id,detail:row.last_error}:undefined;
    },
    async recoverProvider(adapter:string,channel:Channel,now:Date) {
      await db.batch([
        db.prepare("UPDATE provider_outages SET state='recovered',recovered_at=?,updated_at=? WHERE adapter=? AND channel=? AND state IN ('observing','paused')").bind(now.getTime(),now.getTime(),adapter,channel),
        db.prepare("UPDATE campaign_channel_pauses SET resumed_at=?,updated_at=? WHERE channel=? AND reason='provider-outage' AND resumed_at IS NULL").bind(now.getTime(),now.getTime(),channel),
      ]);
    },
    async claimOutageProbe(adapter:string,channel:Channel,now:Date,intervalMs:number) {
      const claim=await db.prepare(`INSERT INTO provider_health(adapter,channel,next_probe_at) VALUES(?,?,?)
        ON CONFLICT(adapter,channel) DO UPDATE SET next_probe_at=excluded.next_probe_at WHERE provider_health.next_probe_at<=?
        RETURNING adapter`).bind(adapter,channel,now.getTime()+intervalMs,now.getTime()).first<{adapter:string}>();
      if(claim)await db.prepare("UPDATE provider_outages SET next_probe_at=? WHERE adapter=? AND channel=? AND state IN ('observing','paused')")
        .bind(now.getTime()+intervalMs,adapter,channel).run();
      return claim;
    },
    async recordProviderHealth(adapter:string,channel:Channel,reachable:boolean,code:string,now:Date) {
      await db.prepare('UPDATE provider_health SET reachable=?,code=?,observed_at=? WHERE adapter=? AND channel=?').bind(reachable?1:0,code,now.getTime(),adapter,channel).run();
    },
  };
}
