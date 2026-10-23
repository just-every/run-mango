import {parseFragment,serialize,type DefaultTreeAdapterTypes as Tree} from 'parse5';
import {z} from 'zod';

export const mobileBlockSchema=z.object({block:z.number().int().min(0).max(127),hideOnMobile:z.boolean().optional(),hideOnDesktop:z.boolean().optional(),
  orientation:z.literal('stack').optional(),fontSize:z.number().int().min(10).max(72).optional(),lineHeight:z.number().min(1).max(3).multipleOf(0.01).optional(),
  padding:z.number().int().min(0).max(64).optional(),alignment:z.enum(['left','center','right']).optional()}).strict();
export const mobileSettingsSchema=z.array(mobileBlockSchema).max(128).refine(rows=>new Set(rows.map(row=>row.block)).size===rows.length,'Each mobile block occurs once.');
export type MobileBlock=z.infer<typeof mobileBlockSchema>;
export class MobileEmailError extends Error {}
const mobile='@media only screen and (max-width: 480px){',desktop='@media only screen and (min-width: 481px){';
const prefix='<!doctype html><html><head>',middle='</head><body>',suffix='</body></html>';
export const mobileClass=(block:number)=>'mgo-b'+String(block).padStart(3,'0');
function declarations(row:MobileBlock) {
  const values=new Map<string,string>();
  if(row.hideOnMobile)values.set('display','none');
  else if(row.orientation==='stack'){values.set('display','block');values.set('width','100%');}
  if(row.fontSize!==undefined)values.set('font-size',row.fontSize+'px');
  if(row.lineHeight!==undefined)values.set('line-height',String(row.lineHeight));
  if(row.padding!==undefined)values.set('padding',row.padding+'px');
  if(row.alignment)values.set('text-align',row.alignment);
  return values;
}
/** Pure, bounded output over Mango's closed selector and property vocabulary. */
export function generateMobileStyle(input:unknown) {
  const parsed=mobileSettingsSchema.safeParse(input);
  if(!parsed.success)throw new MobileEmailError('Invalid mobile block settings: '+parsed.error.issues.map(issue=>issue.message).join(' '));
  const rows=[...parsed.data].filter(row=>declarations(row).size||row.hideOnDesktop).sort((a,b)=>a.block-b.block);
  const rules=rows.map(row=>{const values=declarations(row);return values.size?'.'+mobileClass(row.block)+'{'+[...values].map(([name,value])=>`${name}: ${value} !important;`).join('')+'}':'';}).join('');
  const hidden=rows.filter(row=>row.hideOnDesktop).map(row=>'.'+mobileClass(row.block)+'{display: none !important;}').join('');
  const encoded=btoa(JSON.stringify(rows)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  const style=rules||hidden?'<style data-mango-mobile="'+encoded+'">'+(rules?mobile+rules+'}':'')+(hidden?desktop+hidden+'}':'')+'</style>':'';
  const bytes=new TextEncoder().encode(style).byteLength;
  if(bytes>8192)throw new MobileEmailError(`Generated mobile style is ${bytes} bytes; the maximum is 8192 bytes.`);
  return style;
}
function decodeStyle(style:string):MobileBlock[] {
  const match=/^<style data-mango-mobile="([A-Za-z0-9_-]+)">([\s\S]*)<\/style>$/.exec(style);
  if(!match)throw new MobileEmailError('Only Mango’s generated style element is allowed.');
  let settings:MobileBlock[];
  try {settings=mobileSettingsSchema.parse(JSON.parse(atob(match[1].replaceAll('-','+').replaceAll('_','/'))));}
  catch {throw new MobileEmailError('The generated mobile settings are invalid.');}
  if(generateMobileStyle(settings)!==style)throw new MobileEmailError('The style element is not byte-identical to Mango’s regenerated mobile settings.');
  return settings;
}
const elements=(parent:Tree.ParentNode):Tree.Element[]=>parent.childNodes.flatMap(node=>'tagName'in node?[node,...elements('content'in node?node.content as Tree.DocumentFragment:node)]:[]);
export type MobileEnvelope={body:string;style:string;settings:MobileBlock[];issues:string[]};
/** Stored authority is the closed, exactly regenerable block itself, so copies,
 * exports and restored revisions retain settings without a second data model. */
export function mobileEnvelope(source:string):MobileEnvelope {
  const plain={body:source,style:'',settings:[] as MobileBlock[],issues:[] as string[]};
  if(!source.startsWith(prefix))return plain;
  const at=source.indexOf(middle,prefix.length);
  if(at<0||!source.endsWith(suffix))return {...plain,issues:['The generated email document wrapper is incomplete.']};
  const style=source.slice(prefix.length,at),body=source.slice(at+middle.length,-suffix.length);
  try {
    const settings=decodeStyle(style),expected=new Set(settings.map(row=>mobileClass(row.block))),used=new Set<string>();
    for(const node of elements(parseFragment(body)))for(const attr of node.attrs)if(attr.name==='class') {
      if(!expected.has(attr.value)||used.has(attr.value))throw new MobileEmailError('A class is not byte-identical to a unique Mango mobile block.');
      used.add(attr.value);
    }
    if(expected.size!==used.size)throw new MobileEmailError('A generated mobile rule has no matching block.');
    return {body,style,settings,issues:[]};
  }catch(error){return {...plain,issues:[error instanceof Error?error.message:'Invalid generated mobile block.']};}
}
export function mobileDocument(body:string,style:string) {return style?prefix+style+middle+body+suffix:body;}
export function mobileOverrides(settings:readonly MobileBlock[],name:string|undefined,view:'mobile'|'desktop') {
  const row=settings.find(setting=>mobileClass(setting.block)===name);
  return {hidden:Boolean(view==='mobile'?row?.hideOnMobile:row?.hideOnDesktop),values:view==='mobile'&&row?declarations(row):new Map<string,string>()};
}
/** Saving refuses authored authority before canonicalization can discard it. */
export function assertMobileAuthority(source:string) {
  const envelope=mobileEnvelope(source);
  if(envelope.issues.length)throw new MobileEmailError(envelope.issues.join(' '));
  for(const node of elements(parseFragment(envelope.body))) {
    if(node.tagName==='style')throw new MobileEmailError('Authored <style> elements are refused; use mobile block settings.');
    const ownClass=node.attrs.find(attr=>attr.name==='class')?.value,setting=envelope.settings.find(row=>mobileClass(row.block)===ownClass);
    if(setting?.hideOnMobile||setting?.hideOnDesktop){
      const subtree=[node,...elements(node)];
      if(subtree.some(child=>child.tagName==='a'&&child.attrs.some(attr=>attr.name==='href'&&attr.value==='{{unsubscribe_url}}'))||serialize(node).includes('{{physical_address}}'))throw new MobileEmailError('Unsubscribe, postal address and compliance content cannot sit in a hidden block.');
    }
    for(const attr of node.attrs) {
      if(attr.name==='class'&&!envelope.style)throw new MobileEmailError('Authored classes are refused; only generated Mango mobile classes are allowed.');
      if(attr.name==='style'&&/!\s*important|@[a-z-]+/i.test(attr.value))throw new MobileEmailError('Authored !important declarations and at-rules are refused.');
    }
  }
  return envelope;
}
export function applyMobileSettings(source:string,input:unknown) {
  const old=assertMobileAuthority(source),settings=mobileSettingsSchema.parse(input),style=generateMobileStyle(settings);
  const fragment=parseFragment(old.body),blocks=fragment.childNodes.filter((node):node is Tree.Element=>'tagName'in node);
  for(const node of elements(fragment))node.attrs=node.attrs.filter(attr=>attr.name!=='class');
  for(const setting of settings) {
    if(!declarations(setting).size&&!setting.hideOnDesktop)continue;
    const block=blocks[setting.block];if(!block)throw new MobileEmailError(`Mobile block ${setting.block+1} does not exist in this email.`);
    block.attrs.push({name:'class',value:mobileClass(setting.block)});
  }
  return mobileDocument(serialize(fragment),style);
}
