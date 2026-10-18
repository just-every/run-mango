import type { Database } from '@/core/platform/db/client';
import { assertEmailSize, measureEmailSize, EmailTooLargeError, type EmailSizeOptions } from './email-size';
import type { MessageRevision } from './message-content';

/** Only displayName is currently a supported recipient value. Read maxima in
 * D1, not the full contact list; names never leave this service. Separate raw
 * and escaped maxima bound the HTML and text parts even for different people. */
export async function savedEmailSize(database: Database, revision: MessageRevision & {trackingEnabled?:boolean}, options: EmailSizeOptions = {}, enforce = true) {
  const values=options.values;
  if (/\{\{\s*displayName\b/.test(`${revision.emailBody}${revision.emailText}${revision.preheader}`)) {
    const rows=await database.$client.prepare(`SELECT display_name FROM contacts WHERE display_name IS NOT NULL AND TRIM(display_name)<>''
      ORDER BY LENGTH(CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(display_name,'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;'),'''','&#39;') AS BLOB)) DESC LIMIT 1`).all<{display_name:string}>();
    const raw=await database.$client.prepare('SELECT display_name FROM contacts ORDER BY LENGTH(CAST(display_name AS BLOB)) DESC LIMIT 1').first<{display_name:string}>();
    const htmlName=rows.results[0]?.display_name??'',rawName=raw?.display_name??'';
    // Taking the larger rendered total of both independently measured maxima
    // handles raw text and HTML escaping without inventing a contact value.
    const reports=[htmlName,rawName].map(displayName=>measureEmailSize(revision,{...options,values:{...values,displayName}}));
    const size={...reports[0],htmlBytes:Math.max(...reports.map(r=>r.htmlBytes)),textBytes:Math.max(...reports.map(r=>r.textBytes)),exceedsLimit:reports.some(r=>r.exceedsLimit)};
    if(enforce&&size.exceedsLimit) throw new EmailTooLargeError(size);
    return size;
  }
  return enforce?assertEmailSize(revision,options):measureEmailSize(revision,options);
}
