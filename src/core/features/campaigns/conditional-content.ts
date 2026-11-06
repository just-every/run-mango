import {parseFragment,serialize,serializeOuter,type DefaultTreeAdapterTypes as Tree} from 'parse5';
import {z} from 'zod';
import {mobileEnvelope,mobileDocument} from './email-mobile';
import {fieldValue,matchesComparator} from '@/core/features/audience/rule-values';

export const contentConditionSchema=z.object({source:z.enum(['segment','property','topic','predicted-stage','event']),key:z.string().trim().min(1).max(160),comparator:z.enum(['eq','neq','contains','gt','gte','lt','lte']),value:z.union([z.string().max(2000),z.number().finite(),z.boolean()])}).strict();
export type ContentCondition=z.infer<typeof contentConditionSchema>;
export type ContentContext={properties:Record<string,unknown>;segments:string[];knownSegments:string[];unavailableSegments:string[];topics:string[];event?:Record<string,unknown>};
export type BranchChoice={block:number;matches:boolean};
const attribute=(node:Tree.Element,name:string)=>node.attrs.find(a=>a.name===name)?.value;
const escapeAttribute=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function decodeCondition(value:string):ContentCondition|undefined {try{return contentConditionSchema.parse(JSON.parse(value));}catch{return undefined;}}
export function wrapConditional(html:string,condition:ContentCondition,otherwise='') {
  return `<div data-mango-condition="${escapeAttribute(JSON.stringify(condition))}"><div data-mango-branch="match">${html}</div><div data-mango-branch="otherwise">${otherwise}</div></div>`;
}
export function readConditional(node:Tree.ChildNode) {
  if(!('tagName'in node))return undefined;
  const raw=attribute(node,'data-mango-condition');if(raw===undefined)return undefined;
  const branches=node.childNodes.filter((n):n is Tree.Element=>'tagName'in n);
  const condition=decodeCondition(raw);
  if(!condition||node.tagName!=='div'||branches.length!==2||branches[0].tagName!=='div'||branches[1].tagName!=='div'||attribute(branches[0],'data-mango-branch')!=='match'||attribute(branches[1],'data-mango-branch')!=='otherwise'||node.childNodes.some(n=>!('tagName'in n)&&(!('value'in n)||n.value.trim())))throw new Error('Invalid conditional block. Use its matching and otherwise branches.');
  return {condition,html:serialize(branches[0]),otherwise:serialize(branches[1])};
}
export function conditionMatches(condition:ContentCondition,context?:ContentContext) {
  if(!context)return false;
  const {source,key,comparator,value}=condition;
  if(source==='segment'&&(!context.knownSegments.includes(key)||context.unavailableSegments.includes(key)))return false;
  const actual=source==='segment'?context.segments.includes(key):source==='topic'?context.topics.includes(key):source==='event'?context.event?fieldValue(context.event,key):undefined:context.properties[key];
  return matchesComparator(actual,comparator,value);
}
/** Resolve each block once, before interpolation, catalog expansion and text generation. */
export function chooseConditionalContent(source:string,context?:ContentContext,choice?:BranchChoice| 'all') {
  if(!source.includes('data-mango-condition'))return source;
  const envelope=mobileEnvelope(source),fragment=parseFragment(envelope.body);let index=0;
  const visit=(parent:Tree.ParentNode)=>{for(const node of parent.childNodes){if(!('tagName'in node))continue;
    const conditional=readConditional(node);
    if(conditional){const block=index++,matches=choice==='all'?true:choice?.block===block?choice.matches:conditionMatches(conditional.condition,context);const body=parseFragment(choice==='all'?conditional.html+conditional.otherwise:matches?conditional.html:conditional.otherwise);node.childNodes=body.childNodes;for(const child of node.childNodes)child.parentNode=node;node.attrs=node.attrs.filter(a=>a.name!=='data-mango-condition');}
    visit(node);
  }};visit(fragment);return mobileDocument(serialize(fragment),envelope.style);
}
export function conditionalBlocks(source:string) {
  const fragment=parseFragment(mobileEnvelope(source).body),rows:ReturnType<typeof readConditional>[]=[];
  const visit=(parent:Tree.ParentNode)=>{for(const node of parent.childNodes)if('tagName'in node){const row=readConditional(node);if(row)rows.push(row);visit(node);}};visit(fragment);return rows.filter((r):r is NonNullable<typeof r>=>Boolean(r));
}
/** Authoring refuses malformed authority and conditional compliance elements before saving. */
export function assertConditionalContent(source:string) {
  const fragment=parseFragment(mobileEnvelope(source).body);
  const visit=(parent:Tree.ParentNode,inCondition=false)=>{for(const node of parent.childNodes)if('tagName'in node){
    const raw=attribute(node,'data-mango-condition'),branch=attribute(node,'data-mango-branch');
    if(raw!==undefined){if(inCondition)throw new Error('Conditional blocks cannot be nested.');readConditional(node);if(serializeOuter(node).includes('{{physical_address}}')||serializeOuter(node).includes('{{unsubscribe_url}}'))throw new Error('Postal address and unsubscribe content must remain outside conditional blocks.');}
    if(branch!==undefined&&(!inCondition||!['match','otherwise'].includes(branch)))throw new Error('A branch must belong to a conditional block.');
    visit(node,inCondition||raw!==undefined);
  }};visit(fragment);
}
