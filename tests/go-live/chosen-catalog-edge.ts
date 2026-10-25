import {product,variant,page,id,at} from '../shopify/fixtures';
export function chosenCatalogEdge(options:{six?:boolean}={}){
 const unpublished=new Set<number>(),deleted=new Set<number>(),quantities=new Map<number,number>(),prices=new Map<number,string>();const titles=new Map<number,string>();let failure=false;
 const variants=[{n:1601,p:160,title:'Standard',sku:'basil-standard'},{n:1611,p:161,title:'Small',sku:'mint-small'},{n:1612,p:161,title:'Green bundle',sku:'mint-green-bundle'}];
 const numbers=options.six?[160,161,162,163,164,165]:[160,161];
 if(options.six)for(const n of numbers.filter(n=>n>161))variants.push({n:n*10+1,p:n,title:'Standard',sku:'synthetic-mango-'+n});
 const p=(n:number)=>({...product(n),title:titles.get(n)??(options.six?'synthetic-mango-'+n:n===160?'Synthetic Basil':'Synthetic Mint'),vendor:'Mango Workshop',publishedAt:unpublished.has(n)?null:at,status:unpublished.has(n)?'DRAFT':'ACTIVE',onlineStoreUrl:!options.six&&unpublished.has(n)?null:`https://myshop.com/products/product-${n}`,featuredImage:{url:`https://cdn.shopify.com/synthetic-mango-${n}.png`,altText:n===160?'Synthetic Basil':'Synthetic Mint',width:300,height:240},priceRangeV2:{minVariantPrice:{currencyCode:'AUD'}},collections:page([{id:id('Collection',501),title:'Summer harvest'}])});
 const v=(n:number)=>{const row=variants.find(item=>item.n===n)!;return {...variant(n,row.p),title:row.title,sku:row.sku,price:prices.get(n)??'24.00',compareAtPrice:'30.00',inventoryQuantity:quantities.get(n)??7,inventoryItem:{id:id('InventoryItem',n+10000),tracked:true}};};
 return {
  reset(){unpublished.clear();deleted.clear();quantities.clear();titles.clear();failure=false;},title(n:number,value:string){titles.set(n,value);},price(n:number,value:string){prices.set(n,value);},unpublish(n:number){unpublished.add(n);},delete(n:number){deleted.add(n);},stock(n:number,value:number){quantities.set(n,value);},fail(){failure=true;},
  commerce(request:Record<string,unknown>){const query=String(request.query),variables=request.variables as {id?:string};
   if(query.includes('MangoAccess'))return {data:{shop:{myshopifyDomain:'mango-test.myshopify.com'},currentAppInstallation:{accessScopes:['read_customers','read_products','read_inventory','read_locations','read_orders','read_all_orders','read_returns'].map(handle=>({handle}))}}};
   if(query.includes('MangoCatalogNode')){if(failure)return {errors:[{message:'Synthetic catalog unavailable'}]};const n=Number(variables.id?.split('/').pop());return {data:{node:variables.id?.includes('/ProductVariant/')?v(n):deleted.has(n)?null:p(n)}};}
   if(query.includes('products(first:'))return {data:{products:page(numbers.map(n=>p(n)))}};
   if(query.includes('productVariants(first:'))return {data:{productVariants:page(variants.map(row=>v(row.n)))}};
   for(const field of ['customers','orders','inventoryItems'])if(query.includes(field+'(first:'))return {data:{[field]:page([])}};
   throw new Error('Unexpected chosen catalog query');
  },
  links:Object.fromEntries(numbers.flatMap(n=>[[`https://myshop.com/products/product-${n}`,{}],[`https://cdn.shopify.com/synthetic-mango-${n}.png`,{}]])),
 };
}
