import {sha256} from '@/core/platform/crypto';
import type {Database} from '@/core/platform/db/client';
import type {Channel} from '@/core/shared/platform';

export function senderDomain(sender:string) {return sender.trim().toLowerCase().split('@').at(-1)!.replace(/>$/,'');}
export async function recordProviderHold(database:Database,input:{provider:string;scope:string;reason:string;held:boolean;effectiveAt:number;evidenceId:string;detail:string}) {
  await database.$client.prepare(`INSERT INTO provider_holds(provider,scope,reason,held,effective_at,observed_at,evidence_id,detail)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(provider,scope,reason) DO UPDATE SET held=excluded.held,effective_at=excluded.effective_at,
    observed_at=excluded.observed_at,evidence_id=excluded.evidence_id,detail=excluded.detail
    WHERE excluded.effective_at>provider_holds.effective_at OR (excluded.effective_at=provider_holds.effective_at AND excluded.held>provider_holds.held)`)
    .bind(input.provider,input.scope,input.reason,input.held?1:0,input.effectiveAt,Date.now(),input.evidenceId,input.detail).run();
}
export function providerHoldGuard(provider:string,revision='v',channel="'email'") {
  const name=provider.replaceAll("'","''");
  return `NOT EXISTS(SELECT 1 FROM provider_holds h WHERE h.provider='${name}' AND h.held=1 AND
    (h.scope='account' OR h.scope='domain:'||lower(substr(${revision}.from_email,instr(${revision}.from_email,'@')+1))
    OR (${channel}='sms' AND h.scope='sender:'||${revision}.sms_sender)))`;
}
export async function activeProviderHolds(database:Database,provider:string,channel:Channel,sender:string) {
  return (await database.$client.prepare(`SELECT provider,scope,reason,detail,effective_at,evidence_id FROM provider_holds
    WHERE provider=? AND held=1 AND (scope='account' OR scope=?)`).bind(provider,channel==='email'?`domain:${senderDomain(sender)}`:`sender:${sender}`).all<Record<string,unknown>>()).results;
}
/** Signature verification and endpoint account binding happen before this parser. */
export async function importSendgridAccountEvents(database:Database,rawBody:string) {
  const rows:unknown=JSON.parse(rawBody);if(!Array.isArray(rows)||rows.length>1000)throw new Error('Invalid signed SendGrid batch.');
  for(const row of rows) {
    if(!row||row.event!=='account_status_change')continue;
    if(!['compliance_suspend','compliance_deactivate','compliance_ban','reactivate'].includes(row.type)
      ||typeof row.sg_event_id!=='string'||!row.sg_event_id||!Number.isSafeInteger(row.timestamp)||row.timestamp<0)throw new Error('Invalid signed SendGrid account event.');
    const digest=await sha256(JSON.stringify(row)),db=database.$client;
    await db.batch([
      db.prepare('INSERT INTO provider_account_events(provider,event_id,payload_digest) VALUES(?,?,?) ON CONFLICT DO NOTHING').bind('sendgrid',row.sg_event_id,digest),
      db.prepare(`INSERT INTO provider_holds(provider,scope,reason,held,effective_at,observed_at,evidence_id,detail)
        SELECT 'sendgrid','account','compliance',?,?,?,?,? FROM provider_account_events WHERE provider='sendgrid' AND event_id=? AND payload_digest=?
        ON CONFLICT(provider,scope,reason) DO UPDATE SET held=excluded.held,effective_at=excluded.effective_at,
          observed_at=excluded.observed_at,evidence_id=excluded.evidence_id,detail=excluded.detail
        WHERE excluded.effective_at>provider_holds.effective_at OR (excluded.effective_at=provider_holds.effective_at AND excluded.held>provider_holds.held)`)
        .bind(row.type!=='reactivate'?1:0,row.timestamp*1000,Date.now(),`sendgrid:${row.sg_event_id}`,`SendGrid account event: ${row.type}.`,row.sg_event_id,digest),
    ]);
    const stored=await db.prepare("SELECT payload_digest FROM provider_account_events WHERE provider='sendgrid' AND event_id=?").bind(row.sg_event_id).first<{payload_digest:string}>();
    if(stored?.payload_digest!==digest)throw new Error('Signed account event identity was reused with different content.');
  }
}
