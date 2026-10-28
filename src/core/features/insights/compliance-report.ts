import type {Database} from '@/core/platform/db/client';
import type {SenderInspection} from '../sender-verification/types';
import type {ConfigurationInspection} from '../sender-verification/configuration';
import type {SenderBinding} from '../sender-verification/types';
import type {readSenderRates} from './sender-rates-report';
import {reputationFigures,reputationRate,reputationRateState,reputationRule} from '../lifecycle/reputation-figures';
import {COMPLAINT_RATE_LIMIT,HARD_BOUNCE_RATE_LIMIT} from '../lifecycle/reputation-guard';

export type ComplianceState='pass'|'warn'|'fail'|'unknown';
export type ComplianceRow={requirement:string;key:string;state:ComplianceState;value:string;gmail:string;yahoo:string;microsoft:string};
export type DomainCompliance={domain:string;figures:string;rows:ComplianceRow[]};
type StoredInspection=SenderInspection&{evidence?:{binding?:SenderBinding;configuration?:ConfigurationInspection}};
type Rate=Awaited<ReturnType<typeof readSenderRates>>[number];
/** Reporting only: five aggregate reads, no DNS, provider call or state mutation.
 * Inspect persisted authority, never run senderVerification.inspect() from Insights. */
export async function complianceReport(database:Database,senders:Rate[],windowDays:number,now:Date):Promise<DomainCompliance[]> {
  const db=database.$client;
  const [domains,inspections,outcomes,unsubscribes,connection]=await db.batch<Record<string,unknown>>([
    db.prepare(`SELECT lower(substr(from_email,instr(from_email,'@')+1)) domain FROM sender_settings
      UNION SELECT lower(substr(from_email,instr(from_email,'@')+1)) FROM campaign_revisions WHERE from_email<>''`),
    db.prepare(`SELECT i.result_json FROM sender_verification_inspections i JOIN sender_verification_state s ON s.id=i.state_id
      AND s.generation=i.generation AND s.binding_digest=i.binding_digest AND s.configuration_digest=i.configuration_digest
      AND s.observation_id=i.observation_id WHERE s.revoked_at IS NULL AND i.expires_at>? AND i.checked_at<=?
      ORDER BY i.checked_at DESC,i.rowid DESC`).bind(now.getTime(),now.getTime()),
    db.prepare(`SELECT DISTINCT lower(substr(v.from_email,instr(v.from_email,'@')+1)) domain,f.provider
      FROM delivery_facts f JOIN recipient_steps r ON r.id=f.recipient_step_id JOIN campaign_revisions v ON v.id=r.revision_id
      WHERE r.channel='email' AND f.kind IN ('delivered','bounced','complained','failed')`),
    db.prepare(`SELECT lower(substr(v.from_email,instr(v.from_email,'@')+1)) domain,
      COUNT(DISTINCT CASE WHEN json_extract(r.outbound_request_json,'$.content.headers."List-Unsubscribe-Post"')='List-Unsubscribe=One-Click'
        AND json_extract(r.outbound_request_json,'$.content.headers."List-Unsubscribe"') LIKE '<https://%/unsubscribe/one-click/%>' THEN r.id END) headers,
      COUNT(DISTINCT CASE WHEN t.used_method=2 THEN t.id END) one_click,
      COUNT(DISTINCT CASE WHEN t.updated_at>t.used_at THEN t.id END) samples,
      MAX(CASE WHEN t.updated_at>t.used_at THEN t.updated_at-t.used_at END) max_ms
      FROM recipient_steps r JOIN campaign_revisions v ON v.id=r.revision_id
      LEFT JOIN public_action_tokens t ON t.recipient_step_id=r.id AND t.purpose='unsubscribe' AND t.used_at>=?
      WHERE r.channel='email' GROUP BY domain`).bind(now.getTime()-windowDays*86400000),
    db.prepare('SELECT state,account_id,delivery_proved_at,last_error FROM sending_connection WHERE id=1'),
  ]);
  const saved=inspections.results.map(row=>JSON.parse(String(row.result_json)) as StoredInspection);
  const active=connection.results[0];
  return domains.results.filter(row=>row.domain).map(({domain:value})=>{
    const domain=String(value),rate=senders.find(row=>row.channel==='email'&&row.sender===domain);
    const inspection=saved.find(row=>row.evidence?.binding?.domain===domain);
    const auth=inspection?.authentication,configuration=inspection?.evidence?.configuration;
    const measured=unsubscribes.results.find(row=>row.domain===domain);
    const provider=active?(active.account_id==='resend'?'resend':'sendgrid'):undefined;
    const observedProviders=outcomes.results.filter(row=>row.domain===domain).map(row=>String(row.provider));
    const providers=[...new Set([...(rate?.providers??observedProviders),...(provider?[provider]:[])])];
    const hasSignedOutcomes=providers.length>0&&providers.every(name=>outcomes.results.some(row=>row.domain===domain&&row.provider===name))
      &&(!active||(active.state==='connected'&&Boolean(active.delivery_proved_at)&&!active.last_error));
    const authentication=(key:'spf'|'dkim'):ComplianceRow=>({key,requirement:key.toUpperCase(),gmail:'Pass',yahoo:'Pass',microsoft:'Pass',
      state:auth?(auth[key]?'pass':'fail'):'unknown',value:auth?`${key.toUpperCase()} ${auth[key]?'pass':'fail'}; last stored sender check ${new Date(inspection!.checkedAt).toISOString()}`:'Unknown: no current sender authentication observation.'});
    const rateRow=(key:'complaints'|'hard-bounces'):ComplianceRow=>{
      const complaint=key==='complaints',value=complaint?rate?.complaintRate:rate?.hardBounceRate;
      const state=hasSignedOutcomes?reputationRateState(value??null,complaint?COMPLAINT_RATE_LIMIT:HARD_BOUNCE_RATE_LIMIT):'unknown';
      return {key,requirement:complaint?'Spam complaints':'Hard bounces',state,
        gmail:complaint?'Below 0.30%':'Mango MSG-011 limit',yahoo:complaint?'Below 0.30%':'Mango MSG-011 limit',
        microsoft:complaint?'Keep complaints low; Mango MSG-011 limit':'Mango MSG-011 limit',
        value:!hasSignedOutcomes?'delivery events not connected':`${reputationRate(value??null)}; ${complaint?(rate?.complained??0):(rate?.hardBounced??0)} / ${complaint?(rate?.delivered??0):(rate?.attempted??0)} ${complaint?'delivered marketing emails':'attempted marketing hand-offs'}. ${reputationRule}`};
    };
    const policy=configuration?.dmarc;
    return {domain,figures:!hasSignedOutcomes?'delivery events not connected':rate?reputationFigures(rate,windowDays):'Unmeasured: no marketing outcomes or attempts in this reporting window.',rows:[
      authentication('spf'),authentication('dkim'),
      {key:'dmarc',requirement:'DMARC policy and alignment',gmail:'At least p=none; aligned From',yahoo:'At least p=none; aligned From',microsoft:'At least p=none; aligned From',
        state:auth&&policy?(auth.dmarc&&auth.aligned?'pass':'fail'):'unknown',value:auth&&policy?`p=${policy.policy.p}; SPF ${policy.spfAligned?'aligned':'not aligned'}; DKIM ${policy.dkimAligned?'aligned':'not aligned'}; DMARC ${auth.dmarc?'pass':'fail'}.`:'Unknown: no current DMARC policy and alignment observation.'},
      {key:'one-click',requirement:'One-click unsubscribe',gmail:'RFC 8058 and visible link',yahoo:'RFC 8058 and visible link',microsoft:'Working opt-out; Mango requires RFC 8058',
        state:Number(measured?.headers)>0&&Number(measured?.one_click)>0?'pass':'unknown',value:`${Number(measured?.headers??0)} messages with HTTPS one-click headers; ${Number(measured?.one_click??0)} completed one-click requests in this window.${Number(measured?.one_click)>0?' CONT-004 applied before success.':' Working request not yet observed.'}`},
      {key:'unsubscribe-time',requirement:'Unsubscribe processing time',gmail:'Within 2 days',yahoo:'Within 2 days',microsoft:'Honor opt-outs; measured time',
        state:Number(measured?.samples)>0?(Number(measured?.max_ms)<=2*86400000?'pass':'fail'):'unknown',value:Number(measured?.samples)>0?`Maximum ${Number(measured?.max_ms)} ms from stored request time to CONT-004 completion; ${Number(measured?.samples)} timed samples in this window.`:'Unmeasured: 0 timed samples in this window. Legacy request timestamps do not measure completion.'},
      rateRow('complaints'),rateRow('hard-bounces'),
      {key:'postmaster',requirement:'Google Postmaster Tools (optional)',state:'unknown',gmail:'Owner connection, when available',yahoo:'Not applicable',microsoft:'Not applicable',value:'Not connected. Owner Google account and OAuth connection are not implemented.'},
    ]};
  });
}
