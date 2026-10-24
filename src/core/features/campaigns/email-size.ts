import {analyticsContext,analyticsUrl} from '@/core/features/settings/analytics-policy';
import seed from '../../../../seed.json' with {type:'json'};
import { parseEmailHtml, type EmailNode } from './email-html-parse';
import { escapeHtml, voidEmailTags } from './email-html-policy';
import { parsePersonalisationToken } from './authoring-tokens';
import { renderMessageContent, type MessageRevision } from './message-content';
import { contactLink } from './contact-links';

export const emailByteLimit = seed.limits.maxEmailHtmlBytes;
export const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;
export type EmailSizeOptions = {publicBaseUrl?: string; values?: Record<string, string | null | undefined>; trackingEnabled?: boolean; openTrackingEnabled?: boolean};
export type EmailSize = {htmlBytes: number; textBytes: number; limitBytes: number; largestBlocks: Array<{location: string; bytes: number}>; exceedsLimit: boolean};
// The encrypted public-token wire format: 12-byte IV, AES-GCM ciphertext +
// 16-byte tag and 32-byte HMAC, all unpadded base64url. No token is issued.
function tokenLength(idLength: number, purpose: string) {
  const bytes = utf8Bytes(JSON.stringify({id: 'x'.repeat(idLength), purpose, expiresAt: '9999-12-31T23:59:59.999Z'}));
  return 16 + 1 + Math.ceil((bytes + 16) * 4 / 3) + 1 + 43;
}
const tokenUrl = (origin: string, path: string, idLength: number, purpose: string) => `${origin}${path}${'x'.repeat(tokenLength(idLength, purpose))}`;
function largestBlocks(body: string) {
  const tree = parseEmailHtml(body);
  const serialized = (node: EmailNode): string => node.kind === 'text' ? escapeHtml(node.text) : node.kind === 'comment' ? '<!---->' : `<${node.tag}${[...node.attributes].map(([key,value])=>` ${key}="${escapeHtml(value)}"`).join('')}>${node.children.map(serialized).join('')}${node.html && voidEmailTags.has(node.tag) ? '' : `</${node.tag}>`}`;
  const blocks: Array<{location:string;bytes:number}> = [];
  const visit = (nodes: EmailNode[], path = 'body') => nodes.forEach((node,index) => {
    if (node.kind !== 'element') return;
    const location = `${path}/${node.tag}[${index+1}]`;
    // Leaf content blocks avoid reporting a whole nested table three times.
    if (['p','h1','h2','h3','h4','h5','h6','img','li','pre','blockquote'].includes(node.tag) || !node.children.some(child=>child.kind==='element')) blocks.push({location,bytes:utf8Bytes(serialized(node))});
    else visit(node.children,location);
  });
  visit(tree.nodes);
  return blocks.sort((a,b)=>b.bytes-a.bytes).slice(0,3);
}
/** Upper bound for the currently supported newsletter grammar. Each occurrence
 * takes its larger escaped value or fallback; all transmitted URL expansion and
 * the optional pixel are included. Delivery independently checks actual bytes. */
export function measureEmailSize(revision: MessageRevision & {trackingEnabled?: boolean}, options: EmailSizeOptions = {}): EmailSize {
  const origin = (options.publicBaseUrl ?? '').replace(/\/$/, '');
  const unsubscribeUrl = tokenUrl(origin, '/unsubscribe/', 26, 'unsubscribe');
  const values = options.values ?? {};
  const growth = (template: string, html: boolean) => {
    let extra=0;
    for(const match of template.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
      const parsed=parsePersonalisationToken(match[1]);
      if(!parsed?.key)continue;
      const value=Object.hasOwn(values,parsed.key)?values[parsed.key]:undefined;
      const encode=html?escapeHtml:(text:string)=>text;
      extra+=Math.max(0,utf8Bytes(encode(value??''))-utf8Bytes(encode(parsed.fallback??'')));
    }
    return extra;
  };
  const bounded = revision;
  const rewritten = new Map<string,string>();
  if (options.trackingEnabled ?? revision.trackingEnabled) {
    const tracked = tokenUrl(origin,'/l/',36,'link');
    const visit = (nodes: EmailNode[]) => nodes.forEach(node=>{if(node.kind==='element') {const url=node.tag==='a'?node.attributes.get('href'):undefined;if(url && url !== '{{unsubscribe_url}}' && !contactLink(url)){const tagged=analyticsUrl(url,analyticsContext(bounded),'email');rewritten.set(url,utf8Bytes(tagged)>utf8Bytes(tracked)?tagged:tracked);}visit(node.children);}});
    visit(parseEmailHtml(bounded.emailBody).nodes);
  }
  const renderOptions={analytics:analyticsContext(bounded),unsubscribeUrl,rewrittenLinks:rewritten};
  const rendered = renderMessageContent(bounded,renderOptions);
  const pixel = options.openTrackingEnabled ? `<img data-mango-open-estimate="1" src="${tokenUrl(origin,'/o/',36,'open-estimate')}" width="1" height="1" alt="" />` : '';
  const html=rendered.html+pixel;
  // Totals retain the per-occurrence upper bound above. Diagnostics compare
  // real fallback and saved-name renderings, so a growing personalised section
  // is not reported at its much smaller fallback size.
  const sections=new Map<string,{location:string;bytes:number}>();
  const renderings=Object.keys(values).length?[html,renderMessageContent(bounded,{...renderOptions,values}).html+pixel]:[html];
  for(const content of renderings)for(const block of largestBlocks(content)) {
    if(block.bytes>(sections.get(block.location)?.bytes??-1))sections.set(block.location,block);
  }
  const largest=[...sections.values()].sort((a,b)=>b.bytes-a.bytes).slice(0,3);
  const htmlBytes=utf8Bytes(html)+growth(revision.emailBody,true)+growth(revision.preheader,true),textBytes=utf8Bytes(rendered.text)+growth(revision.emailText,false);
  return {htmlBytes,textBytes,limitBytes:emailByteLimit,largestBlocks:largest,exceedsLimit:htmlBytes>emailByteLimit||textBytes>emailByteLimit};
}
export function formatEmailSize(size: EmailSize) {
  return `HTML ${(size.htmlBytes/1024).toFixed(1)} KB (${size.htmlBytes} bytes); plain text ${(size.textBytes/1024).toFixed(1)} KB (${size.textBytes} bytes); limit ${(size.limitBytes/1024).toFixed(1)} KB (${size.limitBytes} bytes) per part. Largest blocks: ${size.largestBlocks.map(block=>`${block.location}: ${block.bytes} bytes`).join('; ')}.`;
}
export class EmailTooLargeError extends Error {
  constructor(readonly size: EmailSize) {super(`Email is too large. ${formatEmailSize(size)}`);}
}
export function assertEmailSize(revision: MessageRevision & {trackingEnabled?: boolean}, options?: EmailSizeOptions) {
  const size=measureEmailSize(revision,options);
  if(size.exceedsLimit) throw new EmailTooLargeError(size);
  return size;
}
