import {z} from 'zod';
import type {Database} from '@/core/platform/db/client';
import type {Platform,SourceRecordInput} from '@/core/shared/platform';
import {escapeHtml,safeEmailUrl} from './email-html-policy';
import {columnsContent} from './email-blocks';
import {CatalogUnavailable,catalogBlocks,type CatalogBlock,type CatalogRenderings,type CatalogRendering} from './catalog-blocks';
const productSchema=z.object({title:z.string(),status:z.string(),catalog:z.object({publishedAt:z.string().nullable(),url:z.string().nullable(),currency:z.string().regex(/^[A-Z]{3}$/),image:z.object({url:z.string(),alt:z.string().nullable(),width:z.number().int().min(2),height:z.number().int().min(2)}).nullable()})});
const variantSchema=z.object({productId:z.string(),title:z.string(),catalog:z.object({price:z.string().regex(/^\d+(?:\.\d{1,4})?$/),compareAtPrice:z.string().regex(/^\d+(?:\.\d{1,4})?$/).nullable(),quantity:z.number().int(),tracked:z.boolean()})});
const amount=(currency:string,value:string)=>currency+' '+value;
function compile(state:CatalogBlock,records:SourceRecordInput[],readAt:string):CatalogRendering {
  const items:CatalogRendering['items']=[],hidden:CatalogRendering['hidden']=[],html:string[]=[],text:string[]=[];
  for(const reference of state.items){
    const p=records.find(record=>record.sourceType==='product'&&record.sourceId===reference.productId),v=records.find(record=>record.sourceType==='variant'&&record.sourceId===reference.variantId);
    if(!p||!v){hidden.push({...reference,reason:'deleted'});continue;}
    const product=productSchema.safeParse(p.payload),variant=variantSchema.safeParse(v.payload);
    if(!product.success||!variant.success||variant.data.productId!==reference.productId)throw new CatalogUnavailable();
    const current=product.data,catalog=current.catalog,chosen=variant.data.catalog;
    if(current.status!=='ACTIVE'||!catalog.publishedAt||!catalog.url){hidden.push({...reference,reason:'unpublished'});continue;}
    if(chosen.tracked&&chosen.quantity<=0){hidden.push({...reference,reason:'out-of-stock'});continue;}
    if(!safeEmailUrl(catalog.url)||catalog.image&&!safeEmailUrl(catalog.image.url))throw new CatalogUnavailable();
    const title=current.title,price=amount(catalog.currency,chosen.price),compare=chosen.compareAtPrice===null?null:amount(catalog.currency,chosen.compareAtPrice);
    let image='';if(catalog.image){const width=Math.min(256,catalog.image.width),height=Math.max(2,Math.round(catalog.image.height*width/catalog.image.width));if(height>9999)throw new CatalogUnavailable();image=`<img src="${escapeHtml(catalog.image.url)}" width="${width}" height="${height}" style="max-width:100%;height:auto" alt="${escapeHtml(catalog.image.alt??title)}">`;}
    html.push(`${image}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(price)}${compare?' <s>'+escapeHtml(compare)+'</s>':''}</p><p><a href="${escapeHtml(catalog.url)}">View product</a></p>`);
    text.push(`${title}\n${price}${compare?' (compare at '+compare+')':''}\n${catalog.url}`);
    items.push({...reference,title,price,compareAtPrice:compare,image:catalog.image?.url??null,url:catalog.url});
  }
  const body=state.layout==='product'?html.join(''):Array.from({length:Math.ceil(html.length/3)},(_,index)=>'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>'+columnsContent(html.slice(index*3,index*3+3))+'</td></tr></table>').join('');
  return {html:body,text:text.join('\n\n'),readAt,items,hidden,skip:items.length===0&&state.empty==='skip'};
}
export function compileCatalog(source:string,records:SourceRecordInput[],readAt:string){const result:CatalogRenderings={};for(const {key,state} of catalogBlocks(source))result[key]=compile(state,records,readAt);return result;}
const readers=new WeakMap<Database,(source:string)=>Promise<CatalogRenderings>>();
export function registerCatalogReader(database:Database,reader:(source:string)=>Promise<CatalogRenderings>){readers.set(database,reader);}
export async function savedCatalogValues(database:Database,source:string){
  if(!catalogBlocks(source).length)return {};
  const reader=readers.get(database);if(!reader)throw new CatalogUnavailable();
  return reader(source);
}
export async function liveCatalogValues(platform:Platform,source:string){
  const blocks=catalogBlocks(source);if(!blocks.length)return {};
  const commerce=platform.commerce;
  if(!commerce||commerce.capabilities().provider!=='shopify'||!commerce.readCatalog)throw new CatalogUnavailable();
  try{return compileCatalog(source,await commerce.readCatalog(blocks.flatMap(({state})=>state.items)),new Date().toISOString());}catch{throw new CatalogUnavailable();}
}
export async function searchCatalog(database:Database,query:string){
  const rows=(await database.$client.prepare(`SELECT p.provider_source_id id,p.payload,p.updated_at FROM source_records p WHERE p.provider='shopify' AND p.source_type='product' AND json_type(p.payload,'$.catalog')='object' AND (instr(lower(json_extract(p.payload,'$.title')||' '||coalesce(json_extract(p.payload,'$.catalog.vendor'),'')||' '||coalesce(json_extract(p.payload,'$.catalog.collections'),'')),lower(?))>0 OR EXISTS(SELECT 1 FROM source_records v WHERE v.provider='shopify' AND v.source_type='variant' AND json_extract(v.payload,'$.productId')=p.provider_source_id AND instr(lower(json_extract(v.payload,'$.sku')),lower(?))>0)) ORDER BY json_extract(p.payload,'$.title'),p.provider_source_id LIMIT 30`).bind(query,query).all<{id:string;payload:string;updated_at:number}>()).results;
  const variants=(await database.$client.prepare("SELECT provider_source_id id,payload FROM source_records WHERE provider='shopify' AND source_type='variant' AND json_extract(payload,'$.productId') IN (SELECT value FROM json_each(?)) AND json_type(payload,'$.catalog')='object' ORDER BY provider_source_id").bind(JSON.stringify(rows.map(row=>row.id))).all<{id:string;payload:string}>()).results;
  return rows.map(row=>{const value=JSON.parse(row.payload);return {id:row.id,title:value.title,vendor:value.catalog.vendor,collections:value.catalog.collections,readAt:new Date(row.updated_at).toISOString(),variants:variants.filter(variant=>JSON.parse(variant.payload).productId===row.id).map(variant=>{const data=JSON.parse(variant.payload);return {id:variant.id,title:data.title,sku:data.sku,price:amount(value.catalog.currency,data.catalog.price),compareAtPrice:data.catalog.compareAtPrice===null?null:amount(value.catalog.currency,data.catalog.compareAtPrice)};})};});
}
