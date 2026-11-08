import {createHash} from 'node:crypto';
import type {IncomingMessage,ServerResponse} from 'node:http';
import type {MailchimpMember} from '../../src/core/features/move-in/mailchimp-transport';

export type MailchimpEdgeRequest = {method:string; path:string; query:string; authorized:boolean; body?:unknown};
export function mailchimpMember(email:string,status:string = 'subscribed'):MailchimpMember {
  return {id:createHash('md5').update(email.toLowerCase()).digest('hex'),email_address:email,status,last_changed:'2026-11-08T00:00:00.000Z'};
}

/** Real HTTP shapes at the test network boundary; no application behavior lives here. */
export function mailchimpEdge(options:{dataCenter?:string; audienceId?:string; apiKey?:string; members?:MailchimpMember[]; pageSize?:number} = {}) {
  const dataCenter = options.dataCenter ?? 'us24', audienceId = options.audienceId ?? 'a24b24c24d';
  const apiKey = options.apiKey ?? 'synthetic-mango-24';
  const members = options.members ?? [];
  const requests:MailchimpEdgeRequest[] = [];
  const failures = {readStatus:0,writeStatus:0,nextStatus:0,redirectTo:'',malformedRead:false,totalDelta:0,dropWriteResponse:false};
  const json = (response:ServerResponse,status:number,value:unknown) => {
    response.writeHead(status,{'Content-Type':'application/json'}); response.end(JSON.stringify(value));
  };
  const handle = async (url:URL,request:IncomingMessage,response:ServerResponse):Promise<boolean> => {
    if (url.hostname !== `${dataCenter}.api.mailchimp.com`) return false;
    const method = request.method ?? '', authorized = request.headers.authorization === `Bearer ${apiKey}`;
    const call:MailchimpEdgeRequest = {method,path:url.pathname,query:url.search,authorized}; requests.push(call);
    if (!authorized) { json(response,401,{title:'Synthetic authorization refusal'}); return true; }
    if (url.protocol !== 'https:') { json(response,400,{title:'HTTPS required'}); return true; }
    if (failures.redirectTo) { response.writeHead(302,{Location:failures.redirectTo}); response.end(); return true; }
    const failure = failures.nextStatus || (method === 'GET' ? failures.readStatus : failures.writeStatus);
    failures.nextStatus = 0;
    if (failure) { json(response,failure,{title:'Synthetic provider failure',detail:'Synthetic private provider detail'}); return true; }
    const base = `/3.0/lists/${audienceId}/members`;
    if (method === 'GET' && url.pathname === base) {
      if (failures.malformedRead) { response.writeHead(200,{'Content-Type':'application/json'}); response.end('{'); return true; }
      const count = Number(url.searchParams.get('count') ?? 10), offset = Number(url.searchParams.get('offset') ?? 0);
      if (!Number.isSafeInteger(count) || count < 1 || count > 1000 || !Number.isSafeInteger(offset) || offset < 0 || url.searchParams.has('status')) {
        json(response,400,{title:'Invalid synthetic pagination'}); return true;
      }
      const size = Math.min(count,Math.max(1,options.pageSize ?? count));
      json(response,200,{members:members.slice(offset,offset+size),total_items:members.length+failures.totalDelta}); return true;
    }
    if (method === 'PATCH' && url.pathname.startsWith(base+'/')) {
      const chunks:Buffer[] = []; let size = 0;
      for await (const chunk of request) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += bytes.length;
        if (size > 1024) { json(response,413,{title:'Synthetic request too large'}); return true; }
        chunks.push(bytes);
      }
      let body:unknown;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { json(response,400,{title:'Invalid synthetic JSON'}); return true; }
      call.body = body;
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || (body as Record<string,unknown>).status !== 'unsubscribed') {
        json(response,400,{title:'Only restrictive writes are allowed'}); return true;
      }
      const id = url.pathname.slice(base.length+1), member = members.find(row => row.id === id);
      if (!member) { json(response,404,{title:'Synthetic member not found'}); return true; }
      member.status = 'unsubscribed'; member.last_changed = new Date().toISOString();
      if (failures.dropWriteResponse) { response.destroy(); return true; }
      json(response,200,member); return true;
    }
    json(response,405,{title:'Unsupported synthetic Mailchimp operation'}); return true;
  };
  return {dataCenter,audienceId,members,requests,failures,handle};
}
