import {useEffect,useRef,useState} from 'react';
import {getJson,requestJson} from '@/core/app/client/lib/api';
import {catalogBlocks,catalogBlockContent,type CatalogBlock,type CatalogRenderings} from '../catalog-blocks';
import {blockContent} from '../email-blocks';
type Product={id:string;title:string;vendor:string|null;collections:Array<string|null>;readAt:string;variants:Array<{id:string;title:string;sku:string|null;price:string;compareAtPrice:string|null}>};
export function CatalogPicker({kind,html,busy,onChange}:{kind:'product'|'product-grid';html:string;busy:boolean;onChange:(value:string)=>void}){
 const state=catalogBlocks(html)[0]?.state;
 const [query,setQuery]=useState(''),[products,setProducts]=useState<Product[]>([]),[variants,setVariants]=useState<Record<string,string>>({}),[working,setWorking]=useState(false),[error,setError]=useState(''),[values,setValues]=useState<CatalogRenderings>();
 const current=useRef({html,onChange});current.current={html,onChange};
 useEffect(()=>{let active=true;setValues(undefined);if(!state)return;void requestJson<{renderings?:CatalogRenderings}>('/api/catalog/preview',{method:'POST',body:JSON.stringify({emailBody:html})}).then(result=>{if(!active)return;if(result.status!==200||!result.data.renderings){setError('Current catalog values are unavailable.');return;}setValues(result.data.renderings);setError('');}).catch(()=>{if(active)setError('Current catalog values are unavailable.');});return()=>{active=false;};},[html]);
 const search=async()=>{setWorking(true);setError('');try{const result=await getJson<{products:Product[]}>('/api/catalog/products?q='+encodeURIComponent(query));setProducts(result.products);}catch{setError('Catalog search is unavailable.');}finally{setWorking(false);}};
 const update=(next:CatalogBlock)=>current.current.onChange(catalogBlockContent(next));
 const choose=(product:Product)=>{const variantId=variants[product.id]??product.variants[0]?.id;if(!variantId)return;const old=catalogBlocks(current.current.html)[0]?.state;const item={productId:product.id,variantId};const items=kind==='product'?[item]:[...(old?.items??[]),item];if(items.length>6||old?.items.some(row=>row.productId===item.productId&&row.variantId===item.variantId))return;update({version:1,provider:'shopify',layout:kind,empty:old?.empty??'hide',items});};
 const rendered=values?Object.values(values)[0]:undefined;
 return <fieldset disabled={busy||working}><legend>Connected catalog</legend>
   <label>Search catalog<input value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();void search();}}}/></label>
   <button className="secondary-action" type="button" onClick={()=>void search()}>Search catalog</button>
   <p>Search by title, SKU, collection or vendor.</p>
   {working?<p role="status">Searching catalog…</p>:null}{error?<p role="alert">{error}</p>:null}
   {products.length?<ul className="saved-links">{products.map(product=><li key={product.id}><strong>{product.title}</strong><span>{product.vendor}</span>
     <label>Variant for {product.title}<select value={variants[product.id]??product.variants[0]?.id??''} onChange={event=>setVariants(old=>({...old,[product.id]:event.target.value}))}>{product.variants.map(variant=><option value={variant.id} key={variant.id}>{variant.title} · {variant.sku} · {variant.price}</option>)}</select></label>
     <button className="secondary-action" type="button" disabled={!product.variants.length||kind==='product-grid'&&(state?.items.length??0)>=6} onClick={()=>choose(product)}>Choose {product.title}</button>
   </li>)}</ul>:null}
   {state?<><h4>Chosen products</h4><ol>{state.items.map((item,index)=>{const value=rendered?.items.find(row=>row.productId===item.productId&&row.variantId===item.variantId),hidden=rendered?.hidden.find(row=>row.productId===item.productId&&row.variantId===item.variantId);return <li key={item.productId+item.variantId}><strong>{value?.title??'Selected product '+(index+1)}</strong><p data-catalog-state={hidden?.reason}>{value?value.price:hidden?.reason==='deleted'?'Removed from the store':hidden?.reason==='unpublished'?'Not published in the store':hidden?.reason==='out-of-stock'?'Out of stock':'Current values unavailable'}</p><button className="secondary-action" type="button" onClick={()=>state.items.length===1?onChange(blockContent(kind)):update({...state,items:state.items.filter((_,i)=>i!==index)})}>Remove chosen product {index+1}</button></li>;})}</ol>
     {rendered?<p>Catalog read at {new Date(rendered.readAt).toLocaleString()}</p>:null}
     <label>When no products remain<select value={state.empty} onChange={event=>update({...state,empty:event.target.value as 'hide'|'skip'})}><option value="hide">Hide the block</option><option value="skip">Skip the message</option></select></label>
     <button type="button" className="secondary-action" onClick={()=>onChange(blockContent(kind))}>Use manual content</button>
   </>:null}
 </fieldset>;
}
