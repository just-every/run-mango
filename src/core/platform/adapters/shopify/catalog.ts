import {object,date,list,type Node} from './values';
const nullableText=(value:unknown,label:string)=>{if(value===null)return null;if(typeof value!=='string')throw new Error(`Shopify ${label} is missing.`);return value;};
const price=(value:unknown,label:string)=>{if(typeof value!=='string'||!/^\d+(?:\.\d{1,4})?$/.test(value))throw new Error(`Shopify ${label} is invalid.`);return value;};
/** Older source snapshots remain readable, but have no usable catalog values;
 * they never acquire invented image, price, publication or inventory values. */
export function productCatalog(node:Node){
  if(!Object.hasOwn(node,'vendor'))return null;
  const image=node.featuredImage===null?null:object(node.featuredImage,'catalog image');
  if(image&&(!Number.isSafeInteger(image.width)||Number(image.width)<2||!Number.isSafeInteger(image.height)||Number(image.height)<2))throw new Error('Shopify catalog image dimensions are invalid.');
  const currency=object(object(node.priceRangeV2,'catalog price range').minVariantPrice,'catalog currency').currencyCode;
  if(typeof currency!=='string'||!/^[A-Z]{3}$/.test(currency))throw new Error('Shopify catalog currency is missing.');
  return {vendor:nullableText(node.vendor,'vendor'),publishedAt:node.publishedAt===null?null:date(node.publishedAt,'publication').toISOString(),url:nullableText(node.onlineStoreUrl,'storefront URL'),currency,
    image:image?{url:nullableText(image.url,'image URL'),alt:nullableText(image.altText,'image description'),width:Number(image.width),height:Number(image.height)}:null,
    collections:list(node.collections,'catalog collections').map(row=>row.title===undefined?null:nullableText(row.title,'collection title'))};
}
export function variantCatalog(node:Node){
  if(!Object.hasOwn(node,'price'))return null;
  if(!Number.isSafeInteger(node.inventoryQuantity)||typeof object(node.inventoryItem).tracked!=='boolean')throw new Error('Shopify catalog inventory is missing.');
  return {price:price(node.price,'variant price'),compareAtPrice:node.compareAtPrice===null?null:price(node.compareAtPrice,'compare-at price'),quantity:Number(node.inventoryQuantity),tracked:object(node.inventoryItem).tracked as boolean};
}
