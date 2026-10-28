import type {DeliveryRequest} from '@/core/shared/platform';
import type {PreparedBy} from '@/vendor/base/agent-door/index.ts';
import {nativeAgent} from './native-context';
import {escapeHtml} from '../campaigns/email-html-policy';

/** Preserve the verified From identity; label the preparer in the actual content. */
export function attributeContent(content:DeliveryRequest['content'],actor:PreparedBy|undefined):DeliveryRequest['content'] {
 if(!actor)return content;
 return {...content,text:content.text+'\n\nPrepared by '+actor.label,
  ...(content.html?{html:content.html+'<p>Prepared by '+escapeHtml(actor.label)+'</p>'}:{}),
  headers:{...content.headers,'X-Mango-Prepared-By':actor.label.replace(/[\r\n]/g,' ')}};
}
export async function campaignPreparer(db:D1Database,revisionId:string):Promise<PreparedBy|undefined> {
 const row=await db.prepare("SELECT prepared_by_json FROM mango_agent_custody WHERE kind='campaign' AND target_id=?").bind(revisionId).first<{prepared_by_json:string}>();
 return row?JSON.parse(row.prepared_by_json):undefined;
}
export const currentPreparer=()=>nativeAgent.getStore()?.context.actor;
