import {mailboxSql,bounceCategorySql,mailboxProviders,bounceCategories,type MailboxProvider,type BounceCategory} from './mailbox-taxonomy';
export type MailboxRow={provider:MailboxProvider;delivered:number;bounced:number;complained:number;clicked:number;clicks:number;bounceReasons:Record<BounceCategory,number>};
export type MailboxReport={windowStart:string;windowEnd:string;hasSignedOutcomes:boolean;rows:MailboxRow[]};
const bounced="(f.kind='bounced' OR json_extract(f.detail_json,'$.providerEvent') IN ('bounce','bounced'))";
/** Independent fact aggregates prevent delivery × click multiplication. All reads share one D1 snapshot. */
export async function mailboxReport(db:D1Database,since:Date,until:Date):Promise<MailboxReport> {
  const mailbox=mailboxSql('r.destination'),window=[since.getTime(),until.getTime()];
  const [events,bounces,clicks,seen]=await db.batch<Record<string,unknown>>([
    db.prepare(`SELECT ${mailbox} mailbox_provider,
      COUNT(DISTINCT CASE WHEN f.kind='delivered' THEN r.id END) delivered,
      COUNT(DISTINCT CASE WHEN ${bounced} THEN r.id END) bounced,
      COUNT(DISTINCT CASE WHEN f.kind='complained' THEN r.id END) complained
      FROM delivery_facts f JOIN recipient_steps r ON r.id=f.recipient_step_id
      WHERE r.channel='email' AND r.destination<>'' AND f.provider_occurred_at BETWEEN ? AND ? GROUP BY mailbox_provider`).bind(...window),
    db.prepare(`WITH ranked AS (SELECT r.destination,f.detail_json,ROW_NUMBER() OVER(PARTITION BY r.id ORDER BY f.provider_occurred_at DESC,f.identity_key DESC) position
      FROM delivery_facts f JOIN recipient_steps r ON r.id=f.recipient_step_id WHERE r.channel='email' AND r.destination<>'' AND ${bounced} AND f.provider_occurred_at BETWEEN ? AND ?)
      SELECT ${mailboxSql('destination')} mailbox_provider,${bounceCategorySql('detail_json')} reason,COUNT(*) count FROM ranked WHERE position=1 GROUP BY mailbox_provider,reason`).bind(...window),
    db.prepare(`SELECT ${mailbox} mailbox_provider,COUNT(DISTINCT r.id) clicked,COUNT(*) clicks FROM link_click_facts c JOIN recipient_steps r ON r.id=c.recipient_step_id
      WHERE r.channel='email' AND r.destination<>'' AND c.automated=0 AND c.occurred_at BETWEEN ? AND ? GROUP BY mailbox_provider`).bind(...window),
    db.prepare(`SELECT EXISTS(SELECT 1 FROM delivery_facts f JOIN recipient_steps r ON r.id=f.recipient_step_id WHERE r.channel='email' AND f.kind IN ('delivered','bounced','complained','failed')) present`),
  ]);
  const rows=mailboxProviders.map(provider=>({provider,delivered:0,bounced:0,complained:0,clicked:0,clicks:0,bounceReasons:Object.fromEntries(bounceCategories.map(reason=>[reason,0])) as Record<BounceCategory,number>}));
  const row=(provider:unknown)=>rows.find(value=>value.provider===provider)!;
  for(const entry of events.results){const target=row(entry.mailbox_provider);for(const metric of ['delivered','bounced','complained'] as const)target[metric]=Number(entry[metric]);}
  for(const entry of bounces.results)row(entry.mailbox_provider).bounceReasons[entry.reason as BounceCategory]=Number(entry.count);
  for(const entry of clicks.results)Object.assign(row(entry.mailbox_provider),{clicked:Number(entry.clicked),clicks:Number(entry.clicks)});
  return {windowStart:since.toISOString(),windowEnd:until.toISOString(),hasSignedOutcomes:Boolean(seen.results[0]?.present),rows};
}
