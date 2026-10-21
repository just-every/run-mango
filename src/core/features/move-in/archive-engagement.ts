import { csvRows, parseCsv } from '@/core/features/audience/csv';
import { canonicalEmail } from '@/core/features/audience/identity';
import { timestamp, type NormalizedImportRow } from '@/core/features/audience/import-normalize';
import type { ImportPlan } from '@/vendor/base/import-kit/src/types';
import type { ArchiveEntry } from './zip-reader';
import { ArchiveRefused } from './zip-reader';
import { archiveLimits } from './archive-limits';
import type { ArchivePart } from './archive-parts';
import type { ContentRecord } from './archive-content';

export type EngagementRow = {source: string; sourceOrdinal: number; row: number; email: string; campaign: string; kind: 'click'|'open'; at: number; link: string|null};
export type EngagementSummary = {rows: number; imported: number; dropped: number; reasons: Record<string,number>};
const empty = (): EngagementSummary => ({rows:0,imported:0,dropped:0,reasons:{}});

/** Validate the source calendar before Date.parse can roll an impossible day forward.
 * Keep the shared parser's UTC CSV handling and supported timezone/precision forms.
 */
function engagementTimestamp(value: string | undefined) {
  const text = value?.trim() ?? '';
  const numeric = /^([+-]?\d+)[./-](\d+)[./-](\d+)/.exec(text);
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const monthName = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';
  // Named-month dates can put the year before or after the day. Ignore clock
  // fields so a following hour cannot be mistaken for a year.
  const calendarText = text.replace(/\b\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?/g, '');
  const monthFirst = new RegExp(`\\b${monthName}[\\s,-]+(\\d+)[\\s,-]+(\\d+)\\b`, 'i').exec(calendarText);
  const monthMiddle = new RegExp(`\\b(\\d+)[\\s,-]+${monthName}[\\s,-]+(\\d+)\\b`, 'i').exec(calendarText);
  const monthLast = new RegExp(`\\b(\\d+)[\\s,-]+(\\d+)[\\s,-]+${monthName}\\b`, 'i').exec(calendarText);
  const isDay = (number: number) => number >= 1 && number <= 31;
  let calendar: number[] | null = null, explicitYear = false;
  if (numeric) {
    const [first, second, third] = numeric.slice(1).map(Number);
    explicitYear = numeric[1].replace(/^[+-]/, '').length >= 4;
    calendar = explicitYear || !isDay(first) ? [first, second, third] : [third, first, second];
  } else {
    const named = [
      monthFirst && {at:monthFirst.index, parts:[monthFirst[1], monthFirst[2], monthFirst[3]]},
      monthMiddle && {at:monthMiddle.index, parts:[monthMiddle[2], monthMiddle[1], monthMiddle[3]]},
      monthLast && {at:monthLast.index, parts:[monthLast[3], monthLast[1], monthLast[2]]},
    ].filter((entry): entry is {at:number;parts:string[]} => Boolean(entry)).sort((a,b) => a.at-b.at)[0]?.parts;
    if (named) {
      const month = months.indexOf(named[0].toLowerCase()) + 1, first = Number(named[1]), second = Number(named[2]);
      calendar = isDay(first) ? [second, month, first] : [first, month, second];
    }
  }
  if (calendar) {
    const [sourceYear, month, day] = calendar;
    // Match the existing parser's legacy two-digit year convention.
    const year = sourceYear < 100 && !explicitYear ? sourceYear + (sourceYear < 50 ? 2000 : 1900) : sourceYear;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > days[month - 1]) return null;
  }
  return timestamp(value);
}

/** Only addresses admitted by this move-in can acquire imported facts. */
export function engagementContacts(plan?: ImportPlan) {
  const contacts = new Set<string>();
  for (const entry of plan?.entries ?? []) {
    const row = entry.source.payload as unknown as NormalizedImportRow;
    if (!entry.rejection && row.email ) contacts.add(row.email);
  }
  return contacts;
}

export function reviewEngagement(parts: Array<{entry:ArchiveEntry;part:ArchivePart}>, records: ContentRecord[], addresses:Set<string>) {
  const summary=empty(), accepted:EngagementRow[]=[];
  const campaigns = new Set(records.filter(record=>record.kind==='history').map(record=>record.sourceCampaignId).filter(Boolean));
  const drop=(reason:string)=>{summary.dropped++;summary.reasons[reason]=(summary.reasons[reason]??0)+1;};
  for (const [sourceOrdinal,{entry,part}] of parts.entries()) {
    if (part.kind!=='engagement') continue;
    let rows:ReturnType<typeof parseCsv>;
    try {
      const count=Math.max(0,csvRows(entry.text!).length-1);
      if (summary.rows+count>archiveLimits.engagementRows) throw new ArchiveRefused('too-many-entries',`This archive exceeds ${archiveLimits.engagementRows} engagement rows. Export a shorter time frame.`);
      if(!count)continue;
      rows=parseCsv(entry.text!);
    } catch(error) {
      if(error instanceof ArchiveRefused)throw error;
      // Unparseable quoting cannot establish row boundaries, so refuse the file visibly.
      throw new ArchiveRefused('corrupt-entry', 'The engagement CSV is malformed. Correct its quoting and headers before importing.',entry.path);
    }
    for(const [index,row] of rows.entries()) {
      summary.rows++;
      if(row.__parse_error){drop('malformed-row');continue;}
      const email=canonicalEmail(row.email ?? row['email address']);
      if(!email){drop('invalid-address');continue;}
      if(!addresses.has(email)){drop('address-not-in-move-in');continue;}
      const kind=row.action?.trim().toLowerCase();
      if(kind!=='click'&&kind!=='open'){drop('unsupported-action');continue;}
      let at:number|null;
      try{at=engagementTimestamp(row.timestamp);}catch{at=null;}
      if(at===null||at>Date.now()){drop('invalid-timestamp');continue;}
      const campaign=row.campaign_id?.trim();
      if(!campaign||!campaigns.has(campaign)){drop('campaign-not-in-move-in');continue;}
      const link=(row.url??row.link??'').trim()||null;
      if(link){try{const url=new URL(link);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error();}catch{drop('invalid-link');continue;}}
      accepted.push({source:entry.path,sourceOrdinal,row:index+2,email,campaign,kind,at,link});summary.imported++;
    }
  }
  return {summary,accepted};
}

/** Bounded native batches are idempotent. A resumed step only fills missing rows. */
export async function writeEngagement(db:D1Database,archiveId:string,review:ReturnType<typeof reviewEngagement>,addresses:Set<string>,offset:number) {
  const contacts=new Map((await db.prepare('SELECT e.email,e.contact_id FROM contact_email_addresses e JOIN contacts c ON c.id=e.contact_id WHERE c.merge_lock IS NULL AND e.email IN (SELECT value FROM json_each(?))')
    .bind(JSON.stringify([...addresses])).all<{email:string;contact_id:string}>()).results.map(row=>[row.email,row.contact_id]));
  const histories=new Map((await db.prepare("SELECT id,source_campaign_id FROM move_in_content WHERE archive_id=? AND kind='history' AND state='imported'").bind(archiveId)
    .all<{id:string;source_campaign_id:string}>()).results.map(row=>[row.source_campaign_id,row.id]));
  const withHistory=new Set(review.accepted.map(row=>row.email));
  const historyContacts=new Set([...contacts].filter(([email])=>withHistory.has(email)).map(([,id])=>id));
  // Stable source ordinals preserve row identity even when erasure redacts a source filename.
  const statements=[...addresses].sort().map(email=>{const contact=contacts.get(email);
    if(!contact)throw Error('An imported contact is unavailable. Continue after resolving the conflict.');return db.prepare(`INSERT INTO move_in_contact_history(id,archive_id,contact_id,has_history) VALUES(?,?,?,?) ON CONFLICT(archive_id,contact_id) DO NOTHING`)
    .bind(`${archiveId}:${contact}`,archiveId,contact,historyContacts.has(contact)?1:0);});
  for(const row of review.accepted){
    const contact=contacts.get(row.email), history=histories.get(row.campaign);
    if(!contact||!history)throw Error('An engagement contact or campaign changed during import. Continue after resolving the conflict.');
    statements.push(db.prepare(`INSERT INTO imported_engagement_facts(id,archive_id,contact_id,history_id,source,source_row,source_ordinal,source_campaign_id,link,kind,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(archive_id,source_ordinal,source_row) DO NOTHING`)
      .bind(`${archiveId}:${row.sourceOrdinal}:${row.row}`,archiveId,contact,history,row.source,row.row,row.sourceOrdinal,row.campaign,row.link,row.kind,row.at));
  }
  const page=statements.slice(offset,offset+50);
  if(page.length)await db.batch([...page,db.prepare("UPDATE move_in_archives SET engagement_done=?,updated_at=? WHERE id=? AND state='applying'").bind(offset+page.length,Date.now(),archiveId)]);
  return offset+page.length>=statements.length;
}
