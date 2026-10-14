// Shopify Admin network fixtures. The application adapter still authenticates,
// queries, paginates and normalizes every supplied provider record.
const connection=(nodes:unknown[])=>({nodes,pageInfo:{hasNextPage:false,endCursor:null}});
export const bag=(amount:string,currency='USD')=>({shopMoney:{amount,currencyCode:currency},presentmentMoney:{amount,currencyCode:currency}});
const identities=new Map<string,string>();
const gid=(kind:string,id:string)=>{
  const key=`${kind}:${id}`;
  if(!identities.has(key))identities.set(key,/^\d+$/.test(id)?id:String(100000+identities.size));
  return `gid://shopify/${kind}/${identities.get(key)}`;
};
export function storeEdge() {
  const orders=new Map<string,Record<string,any>>();
  const answer=(request:Record<string,unknown>)=>{
    const query=String(request.query),variables=request.variables as {id?:string};
    if(query.includes('MangoAccess'))return {data:{shop:{myshopifyDomain:'mango-test.myshopify.com'},currentAppInstallation:{id:gid('AppInstallation','1'),accessScopes:['read_customers','read_products','read_inventory','read_locations','read_orders','read_all_orders','read_returns'].map(handle=>({handle}))}}};
    if(query.includes('MangoNode'))return {data:{node:orders.get(variables.id!)??null}};
    const field=['customers','products','productVariants','inventoryItems','orders'].find(name=>query.includes(`${name}(`));
    return field?{data:{[field]:connection(field==='orders'?[...orders.values()]:[])}}:{errors:[{message:'Unexpected Shopify query'}]};
  };
  const order=(id:string,email:string,at:Date,options:{amount?:string;received?:string;currency?:string;status?:string;test?:boolean;products?:string[]}={})=>{
    const total=bag(options.amount??'10.00',options.currency),timestamp=at.toISOString();
    const value={id:gid('Order',id),createdAt:timestamp,processedAt:timestamp,updatedAt:timestamp,cancelledAt:null,cancelReason:null,test:options.test??false,
      displayFinancialStatus:options.status??'PAID',displayFulfillmentStatus:'FULFILLED',currencyCode:options.currency??'USD',
      customer:{id:gid('Customer',email.split('@')[0]),email,phone:null,firstName:'Store',lastName:'Buyer',defaultAddress:null,emailMarketingConsent:null,smsMarketingConsent:null},
      totalPriceSet:total,currentTotalPriceSet:total,totalReceivedSet:bag(options.received??options.amount??'10.00',options.currency),totalRefundedSet:bag('0',options.currency),
      lineItems:connection((options.products??['1']).map((product,index)=>({id:gid('LineItem',`${id}-${index}`),quantity:1,currentQuantity:1,product:{id:gid('Product',product)},variant:{id:gid('ProductVariant',product)},originalTotalSet:total,discountedTotalSet:total}))),returns:connection([]),refunds:[]};
    orders.set(value.id,value);return value as Record<string,any>;
  };
  const refund=(parent:Record<string,any>,id:string,amount:string,at:Date,status='SUCCESS')=>{
    const value={id:gid('Refund',id),createdAt:at.toISOString(),updatedAt:at.toISOString(),totalRefundedSet:bag(amount,parent.currencyCode),
      refundLineItems:connection([{lineItem:parent.lineItems.nodes[0],quantity:1,restockType:'NO_RESTOCK',subtotalSet:bag(amount,parent.currencyCode),totalTaxSet:bag('0',parent.currencyCode)}]),
      transactions:connection([{id:gid('OrderTransaction',id),kind:'REFUND',status,test:false,createdAt:at.toISOString(),processedAt:at.toISOString(),amountSet:bag(amount,parent.currencyCode)}])};
    parent.refunds.push(value);parent.updatedAt=at.toISOString();return value;
  };
  return {orders,answer,order,refund};
}
