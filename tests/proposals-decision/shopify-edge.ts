import {createShopifyAdapter} from '../../src/core/platform/adapters/shopify';
import type {createAppServices} from '../../src/core/app/app';

const shop = 'proposal-fixture.myshopify.com';
const accessToken = 'synthetic-proposal-fixture-admin-token';

export function proposalCommerce() {
  return createShopifyAdapter({storeUrl:new URL(`https://${shop}`),exclusiveShop:shop,accessToken,webhookSecret:'synthetic-proposal-fixture-webhook-secret'});
}

export const proposalCustomer = {email:'avery.buyer@example.test',phone:'+61433333333',firstName:'Avery',lastName:'Quinlan'};

/** Only the Shopify HTTP edge is doubled; access verification, normalization,
 * sync checkpoints and source ingestion use the production implementation. */
export async function synchronizeProposalSource(services:ReturnType<typeof createAppServices>, sourceType:'product'|'customer' = 'product') {
  const transport = globalThis.fetch;
  const at = new Date().toISOString();
  const pages = {
    product:{connection:'products',node:{id:'gid://shopify/Product/1',createdAt:at,updatedAt:at,title:'Garden linen',handle:'garden-linen',status:'ACTIVE',category:null,collections:{nodes:[],pageInfo:{hasNextPage:false,endCursor:null}}}},
    customer:{connection:'customers',node:{id:'gid://shopify/Customer/1',createdAt:at,updatedAt:at,...proposalCustomer,defaultAddress:null,emailMarketingConsent:null,smsMarketingConsent:null}},
  };
  const {connection,node} = pages[sourceType];
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname !== shop) return transport(input, init);
    const request = new Request(input, init);
    if (request.method !== 'POST' || !/^\/admin\/api\/[^/]+\/graphql\.json$/.test(url.pathname)
      || request.headers.get('X-Shopify-Access-Token') !== accessToken) {
      throw new Error('Unexpected proposal Shopify request.');
    }
    const {query,variables} = await request.json() as {query:string;variables:Record<string,unknown>};
    if (query.includes('query MangoAccess')) return Response.json({data:{shop:{myshopifyDomain:shop},currentAppInstallation:{
      id:'gid://shopify/AppInstallation/1',accessScopes:['read_customers','read_products','read_inventory','read_locations','read_orders','read_all_orders','read_returns'].map(handle=>({handle})),
    }}});
    if (query.includes('query MangoSource') && new RegExp(`\\b${connection}\\(first:`).test(query) && variables.cursor === null) {
      return Response.json({data:{[connection]:{nodes:[node],pageInfo:{hasNextPage:false,endCursor:null}}}});
    }
    throw new Error('Unexpected proposal Shopify query.');
  };
  try {
    const synchronize = services.lifecycleRuntime.synchronizeCommerce;
    if (!synchronize) throw new Error('Proposal commerce is not composed.');
    const result = await synchronize({sourceType,provider:'shopify'});
    if (!result || typeof result !== 'object' || !('status' in result) || result.status !== 'completed') {
      throw new Error(`Proposal ${sourceType} snapshot did not complete.`);
    }
  } finally {
    globalThis.fetch = transport;
  }
}
