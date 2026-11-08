import {createHash} from 'node:crypto';

export type MailchimpOptions = {dataCenter:string; audienceId:string; apiKey:string};
export type MailchimpMember = {id:string; email_address:string; status:string; last_changed?:string};

const pageSize = 1000, maxPages = 250, maxBytes = 64_000_000, pageBytes = 1_000_000;
const failed = () => new Error('Mailchimp request could not be completed.');
const hash = (email:string) => createHash('md5').update(email.toLowerCase()).digest('hex');
const validEmail = (value:unknown):value is string => typeof value === 'string' && value.length <= 320 && /^[^\s@]+@[^\s@]+$/.test(value);

function endpoint(options:MailchimpOptions) {
  if (typeof options.dataCenter !== 'string' || !/^us[1-9][0-9]{0,2}$/.test(options.dataCenter)
    || typeof options.audienceId !== 'string' || !/^[a-zA-Z0-9]{1,64}$/.test(options.audienceId)
    || typeof options.apiKey !== 'string' || !/^[\x21-\x7e]{1,512}$/.test(options.apiKey)) throw new Error('Invalid Mailchimp connection settings.');
  return `https://${options.dataCenter}.api.mailchimp.com/3.0/lists/${options.audienceId}/members`;
}

function member(value:unknown):MailchimpMember {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw failed();
  const row = value as Record<string,unknown>;
  if (!validEmail(row.email_address) || typeof row.id !== 'string' || row.id !== hash(row.email_address)
    || typeof row.status !== 'string' || !/^[a-z-]{1,40}$/.test(row.status)
    || (row.last_changed !== undefined && (typeof row.last_changed !== 'string' || !Number.isFinite(Date.parse(row.last_changed))))) throw failed();
  return {id:row.id,email_address:row.email_address,status:row.status,...(row.last_changed === undefined ? {} : {last_changed:row.last_changed as string})};
}

/** The deadline covers headers and streamed bytes; upstream details never escape. */
async function request(url:string, apiKey:string, method:'GET'|'PATCH', remaining:number, deadline:number):Promise<{value:unknown;size:number;notFound?:boolean}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1,Math.min(10_000,deadline-Date.now())));
  let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
  try {
    const cancelled = new Promise<never>((_,reject) => controller.signal.addEventListener('abort',() => reject(failed()),{once:true}));
    return await Promise.race([cancelled,(async () => {
      if (Date.now() >= deadline) throw failed();
      const response = await fetch(url,{method,redirect:'error',signal:controller.signal,
        headers:{Authorization:`Bearer ${apiKey}`,Accept:'application/json',...(method === 'PATCH' ? {'Content-Type':'application/json'} : {})},
        ...(method === 'PATCH' ? {body:JSON.stringify({status:'unsubscribed'})} : {})});
      if (method === 'PATCH' && response.status === 404) { void response.body?.cancel().catch(() => {}); return {value:null,size:0,notFound:true}; }
      if (!response.ok || !response.body) { void response.body?.cancel().catch(() => {}); throw failed(); }
      reader = response.body.getReader();
      const chunks:Uint8Array[] = []; let size = 0;
      while (true) {
        const {done,value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > Math.min(pageBytes,remaining)) { controller.abort(); throw failed(); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
      const text = new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      if (text.includes(apiKey)) throw failed();
      return {value:JSON.parse(text) as unknown,size};
    })()]);
  } catch { throw failed(); }
  finally { clearTimeout(timeout); if (controller.signal.aborted) void reader?.cancel().catch(() => {}); }
}

/** No status filter: restrictions in every audience member status must be seen. */
export async function readMailchimpMembers(options:MailchimpOptions):Promise<MailchimpMember[]> {
  const base = endpoint(options), deadline = Date.now()+60_000;
  const members:MailchimpMember[] = [], seen = new Set<string>();
  let bytes = 0, expected:number|undefined;
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(base);
    url.searchParams.set('count',String(pageSize));
    url.searchParams.set('offset',String(members.length));
    url.searchParams.set('fields','members.id,members.email_address,members.status,members.last_changed,total_items');
    const result = await request(url.href,options.apiKey,'GET',maxBytes-bytes,deadline);
    bytes += result.size;
    if (!result.value || typeof result.value !== 'object' || Array.isArray(result.value)) throw failed();
    const data = result.value as Record<string,unknown>, total = data.total_items;
    if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0 || total > maxPages*pageSize
      || (expected !== undefined && expected !== total) || !Array.isArray(data.members) || data.members.length > pageSize) throw failed();
    expected = total;
    for (const value of data.members) {
      const row = member(value);
      if (seen.has(row.id)) throw failed();
      seen.add(row.id); members.push(row);
    }
    if (members.length > total) throw failed();
    if (members.length === total) return members;
    if (!data.members.length) throw failed();
  }
  throw failed();
}

/** The only supported mutation restricts existing members; it cannot subscribe. */
export async function unsubscribeMailchimpMember(options:MailchimpOptions,email:string):Promise<MailchimpMember|null> {
  const base = endpoint(options);
  if (!validEmail(email)) throw new Error('Invalid Mailchimp member address.');
  const id = hash(email);
  const result = await request(`${base}/${id}`,options.apiKey,'PATCH',pageBytes,Date.now()+10_000);
  if (result.notFound) return null;
  const updated = member(result.value);
  if (updated.id !== id || updated.status !== 'unsubscribed') throw failed();
  return updated;
}
