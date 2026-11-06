import {parseFragment,serialize,type DefaultTreeAdapterTypes as Tree} from 'parse5';
import {z} from 'zod';
import {audiencePredicateSchema} from '@/core/features/lifecycle/rules';
import {mobileEnvelope,mobileDocument} from './email-mobile';

/** BUILD-005: a block shown only to contacts a condition selects, with an optional "otherwise" block.
 * Both are div elements that store the condition itself (never contact data), so the saved body stays the
 * authority and every recipient's choice is made at preview, review and hand-off from current facts. */
const contactFields=['property','topic','tags','rfmStage'] as const;
export const contentConditionSchema=z.discriminatedUnion('kind',[
  z.object({kind:z.literal('segment'),segmentId:z.string().trim().min(1).max(160)}).strict(),
  z.object({kind:z.literal('contact'),predicate:audiencePredicateSchema.refine(p=>p.sourceType==='contact'&&(contactFields as readonly string[]).includes(p.field),'Use a property, topic, tag or lifecycle stage.')}).strict(),
]);
export type ContentCondition=z.infer<typeof contentConditionSchema>;
export type ConditionOutcomes=Record<string,boolean>;
/** Preview branches: every condition met, none met, or every block kept (the largest possible message, for size). */
export type ConditionBranch='then'|'otherwise'|'all';
export class ConditionUnavailable extends Error {constructor(detail='The condition on a conditional block cannot be evaluated.'){super(detail);}}

export const encodeCondition=(input:ContentCondition)=>btoa(JSON.stringify(contentConditionSchema.parse(input)));
export function decodeCondition(value:string):ContentCondition|undefined {
  if(value.length>4096||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))return;
  try{const parsed=contentConditionSchema.parse(JSON.parse(atob(value)));return encodeCondition(parsed)===value?parsed:undefined;}catch{return;}
}
export const conditionalBlockContent=(condition:ContentCondition,html:string,otherwise?:string)=>
  `<div data-mango-when="${encodeCondition(condition)}">${html}</div>`+(otherwise===undefined?'':`<div data-mango-otherwise="${encodeCondition(condition)}">${otherwise}</div>`);

const elements=(node:Tree.ParentNode):Tree.Element[]=>node.childNodes.flatMap(child=>'tagName'in child?[child,...elements(child)]:[]);
const marker=(node:Tree.Element)=>{
  const when=node.attrs.find(attr=>attr.name==='data-mango-when')?.value,otherwise=node.attrs.find(attr=>attr.name==='data-mango-otherwise')?.value;
  return when!==undefined?{key:when,otherwise:false}:otherwise!==undefined?{key:otherwise,otherwise:true}:undefined;
};

/** The conditions a body carries, once each, in order. A key that does not decode is refused. */
export function conditionalBlocks(source:string){
  if(!source.includes('data-mango-when')&&!source.includes('data-mango-otherwise'))return [];
  const seen=new Map<string,ContentCondition>();
  for(const node of elements(parseFragment(mobileEnvelope(source).body))){
    const found=marker(node);if(!found)continue;
    const condition=decodeCondition(found.key);if(!condition)throw new ConditionUnavailable('A conditional block stores a condition Mango cannot read.');
    seen.set(found.key,condition);
  }
  return [...seen].map(([key,condition])=>({key,condition}));
}

/** Rebuilds the body keeping each marked block `keep` accepts (unwrapped) and dropping the rest. */
function rewriteBlocks(source:string,keep:(found:{key:string;otherwise:boolean})=>boolean){
  const envelope=mobileEnvelope(source),fragment=parseFragment(envelope.body);
  for(const node of [...elements(fragment)].reverse()){
    const found=marker(node);if(!found||!node.parentNode)continue;
    const parent=node.parentNode,index=parent.childNodes.indexOf(node);
    if(keep(found)){for(const child of node.childNodes)child.parentNode=parent;parent.childNodes.splice(index,1,...node.childNodes);}
    else parent.childNodes.splice(index,1);
  }
  return mobileDocument(serialize(fragment),envelope.style);
}

/** The body as one recipient receives it: a block whose condition holds stays, its "otherwise" block goes, and the
 * reverse. Pure over supplied outcomes; a condition with no outcome is never guessed. `force` previews one branch
 * for every condition at once; `all` keeps both blocks. */
export function resolveConditionalBlocks(source:string,outcomes:ConditionOutcomes,force?:ConditionBranch){
  if(!conditionalBlocks(source).length)return source;
  return rewriteBlocks(source,found=>{
    const holds=force==='all'?!found.otherwise:force?force==='then':outcomes[found.key];
    if(holds===undefined)throw new ConditionUnavailable();
    return holds!==found.otherwise;
  });
}

/** Most distinct conditions whose every combination of outcomes is resolved when a rule must hold for all recipients. */
const enumeratedConditions=10;
/** The bodies a recipient can receive: one per combination of condition outcomes. A rule every recipient must meet
 * (the unsubscribe link, the postal address) holds only if it holds in each. Past the cap the one body every
 * combination contains (all conditional blocks removed) stands for them, so a rule is never passed on a block that
 * only some recipients see. */
export function possibleRecipientBodies(source:string){
  const keys=conditionalBlocks(source).map(row=>row.key);
  if(!keys.length)return [source];
  if(keys.length>enumeratedConditions)return [rewriteBlocks(source,()=>false)];
  return Array.from({length:2**keys.length},(_,mask)=>{
    const outcomes=Object.fromEntries(keys.map((key,index)=>[key,Boolean(mask>>index&1)]));
    return resolveConditionalBlocks(source,outcomes);
  });
}
