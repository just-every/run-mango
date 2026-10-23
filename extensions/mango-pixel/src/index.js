import {register} from '@shopify/web-pixels-extension';

// Public settings only. Identity is supplied by Shopify's signed app-proxy
// context at the receiver; no client-supplied customer ID is transmitted.
register(({analytics,init,customerPrivacy,settings})=>{
  if(init.context?.document?.location?.protocol!=='https:')return;
  let privacy=init.customerPrivacy;
  customerPrivacy.subscribe('visitorConsentCollected',event=>{
    const previouslyAllowed=privacy?.analyticsProcessingAllowed&&privacy?.marketingAllowed&&privacy?.saleOfDataAllowed;
    privacy=event.customerPrivacy;
    if(previouslyAllowed&&(!privacy?.analyticsProcessingAllowed||!privacy?.marketingAllowed||!privacy?.saleOfDataAllowed)) {
      void transmit({version:1,channel:settings.channel,id:`privacy:${crypto.randomUUID()}`,name:'privacy_revoked',timestamp:new Date().toISOString(),
        privacy:{analytics:!!privacy?.analyticsProcessingAllowed,marketing:!!privacy?.marketingAllowed,saleOfData:!!privacy?.saleOfDataAllowed},lines:[]}).catch(()=>{});
    }
  });
  const variantLine=(variant,quantity)=>variant?.id&&variant?.product?.id&&Number.isInteger(quantity)&&quantity>0
    ?{productId:variant.product.id,variantId:variant.id,quantity}:null;
  async function send(event){
    if(!privacy?.analyticsProcessingAllowed||!privacy?.marketingAllowed||!privacy?.saleOfDataAllowed)return;
    let lines;
    if(event.name==='product_viewed')lines=[variantLine(event.data.productVariant,1)];
    else if(event.name==='product_added_to_cart')lines=[variantLine(event.data.cartLine?.merchandise,event.data.cartLine?.quantity)];
    else {
      if(!event.data.cart||!Array.isArray(event.data.cart.lines))return;
      lines=event.data.cart.lines.map(item=>variantLine(item.merchandise,item.quantity));
    }
    if(lines.some(item=>!item))return;
    const body={version:1,channel:settings.channel,id:event.id,name:event.name,timestamp:event.timestamp,
      privacy:{analytics:true,marketing:true,saleOfData:true},lines};
    await transmit(body);
  }
  async function transmit(body){
    const raw=JSON.stringify(body);
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    // Use Shopify's actual primary storefront so the account cookie is sent on
    // custom domains. An unavailable storefront cannot supply proxy identity.
    if(!init.data.shop.storefrontUrl)return;
    const storefront=new URL(init.data.shop.storefrontUrl);
    if(storefront.protocol!=='https:')return;
    const url=new URL(settings.proxyPath,storefront);
    if(url.protocol!=='https:'||url.origin!==storefront.origin)return;
    url.searchParams.set('body_digest',digest);url.searchParams.set('event_id',body.id);
    // Recheck after asynchronous work so withdrawal stops collection immediately.
    if(body.name!=='privacy_revoked'&&(!privacy?.analyticsProcessingAllowed||!privacy?.marketingAllowed||!privacy?.saleOfDataAllowed))return;
    await fetch(url,{method:'POST',body:raw,credentials:'include',keepalive:true});
  }
  for(const name of ['product_viewed','cart_viewed','product_added_to_cart'])analytics.subscribe(name,event=>{
    // Client loss remains possible and is never interpreted as absent behavior.
    void send(event).catch(()=>{});
  });
});
