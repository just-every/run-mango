import {parseFragment,serialize,type DefaultTreeAdapterTypes as Tree} from 'parse5';
import {z} from 'zod';
import {mobileEnvelope,mobileDocument} from './email-mobile';
const reference=z.object({productId:z.string().regex(/^gid:\/\/shopify\/Product\/\d+$/),variantId:z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/)}).strict();
export const catalogBlockSchema=z.object({version:z.literal(1),provider:z.literal('shopify'),layout:z.enum(['product','product-grid']),empty:z.enum(['hide','skip']),items:z.array(reference).min(1).max(6)}).strict().refine(value=>value.layout!=='product'||value.items.length===1,'A product block chooses one product.');
export type CatalogBlock=z.infer<typeof catalogBlockSchema>;
export type CatalogReference=z.infer<typeof reference>;
export type CatalogRendering={html:string;text:string;readAt:string;items:Array<{productId:string;variantId:string;title:string;price:string;compareAtPrice:string|null;image:string|null;url:string}>;hidden:Array<{productId:string;variantId:string;reason:'deleted'|'unpublished'|'out-of-stock'}>;skip:boolean};
export type CatalogRenderings=Record<string,CatalogRendering>;
export class CatalogUnavailable extends Error {constructor(){super('The chosen catalog values are unavailable. Sync the connected catalog and try again.');}}
export const encodeCatalogBlock=(input:CatalogBlock)=>btoa(JSON.stringify(catalogBlockSchema.parse(input)));
export function decodeCatalogBlock(value:string):CatalogBlock|undefined {
  if(value.length>8192||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))return;
  try{const parsed=catalogBlockSchema.parse(JSON.parse(atob(value)));return encodeCatalogBlock(parsed)===value?parsed:undefined;}catch{return;}
}
const elements=(node:Tree.ParentNode):Tree.Element[]=>node.childNodes.flatMap(child=>'tagName'in child?[child,...elements(child)]:[]);
export function catalogBlocks(source:string){
  if(!source.includes('data-mango-catalog'))return [];
  return elements(parseFragment(mobileEnvelope(source).body)).flatMap(node=>{const key=node.attrs.find(attr=>attr.name==='data-mango-catalog')?.value;if(!key)return [];const state=decodeCatalogBlock(key);if(!state)throw new CatalogUnavailable();return [{key,state}];});
}
export function catalogBlockContent(state:CatalogBlock){return `<div data-mango-catalog="${encodeCatalogBlock(state)}"></div>`;}
export const catalogTextMarker=(key:string)=>'MANGO_CATALOG_'+key;
/** Expand only typed placeholder elements, after ordinary personalization has
 * rendered, so catalog titles can never introduce managed or contact tokens. */
export function insertCatalogHtml(source:string,renderings:CatalogRenderings){
  const envelope=mobileEnvelope(source),fragment=parseFragment(envelope.body);
  for(const node of elements(fragment)){
    const key=node.attrs.find(attr=>attr.name==='data-mango-catalog')?.value;if(!key||!node.parentNode)continue;
    const value=renderings[key];if(!value)throw new CatalogUnavailable();
    const children=parseFragment(value.html).childNodes,parent=node.parentNode,index=parent.childNodes.indexOf(node);
    for(const child of children)child.parentNode=parent;
    parent.childNodes.splice(index,1,...children);
  }
  return mobileDocument(serialize(fragment),envelope.style);
}
/** Used only for link inspection and byte accounting, never as a second
 * personalization pass over recipient or catalog values. */
export function catalogTextValues(source:string,values:CatalogRenderings){return source.replace(/MANGO_CATALOG_([A-Za-z0-9+/]+={0,2})/g,(match,key:string)=>decodeCatalogBlock(key)?values[key]?.text??match:match);}
